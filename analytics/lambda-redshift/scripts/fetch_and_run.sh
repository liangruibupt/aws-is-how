#!/bin/bash

# Copyright 2013-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the
# License. A copy of the License is located at
#
# http://aws.amazon.com/apache2.0/
#
# or in the "LICENSE.txt" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
# OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and
# limitations under the License.

# This script can help you download and run a script from S3 using aws-cli.
# It can also download a zip file from S3 and run a script from inside.
# See below for usage instructions.

PATH="/bin:/usr/bin:/sbin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/.local/bin:~/.local/lib/python3.7/site-packages"
BASENAME="${0##*/}"

usage () {
  if [ "${#@}" -ne 0 ]; then
    echo "* ${*}"
    echo
  fi
  cat <<ENDUSAGE
Usage:

export BATCH_FILE_TYPE="script"
export BATCH_FILE_S3_URL="s3://my-bucket/my-script"
export S3_BUCKET_REGION="cn-northwest-1"
${BASENAME} script-from-s3 [ <script arguments> ]

  - or -

export BATCH_FILE_TYPE="zip"
export BATCH_FILE_S3_URL="s3://my-bucket/my-zip"
export S3_BUCKET_REGION="cn-northwest-1"
${BASENAME} script-from-zip [ <script arguments> ]
ENDUSAGE

  exit 2
}

# Standard function to print an error and exit with a failing return code
error_exit () {
  echo "${BASENAME} - ${1}" >&2
  exit 1
}

# Standard function to print an info
info_print () {
  echo "${BASENAME} - ${1}" >&2
}

# Check what environment variables are set
if [ -z "${BATCH_FILE_TYPE}" ]; then
  usage "BATCH_FILE_TYPE not set, unable to determine type (zip/script) of URL ${BATCH_FILE_S3_URL}"
fi

if [ -z "${BATCH_FILE_S3_URL}" ]; then
  usage "BATCH_FILE_S3_URL not set. No object to download."
fi

scheme="$(echo "${BATCH_FILE_S3_URL}" | cut -d: -f1)"
if [ "${scheme}" != "s3" ]; then
  usage "BATCH_FILE_S3_URL must be for an S3 object; expecting URL starting with s3://"
fi

if [ -z "${S3_BUCKET_REGION}" ]; then
  usage "S3_BUCKET_REGION not set. No object to download."
fi

# Check that necessary programs are available
which aws >/dev/null 2>&1 || error_exit "Unable to find AWS CLI executable."
which unzip >/dev/null 2>&1 || error_exit "Unable to find unzip executable."

# Create a temporary directory to hold the downloaded contents, and make sure
# it's removed later, unless the user set KEEP_BATCH_FILE_CONTENTS.
cleanup () {
   if [ -z "${KEEP_BATCH_FILE_CONTENTS}" ] \
     && [ -n "${TMPDIR}" ] \
     && [ "${TMPDIR}" != "/" ]; then
      rm -r "${TMPDIR}"
   fi
}
trap 'cleanup' EXIT HUP INT QUIT TERM
# mktemp arguments are not very portable.  We make a temporary directory with
# portable arguments, then use a consistent filename within.
TMPDIR="$(mktemp -d -t tmp.XXXXXXXXX)" || error_exit "Failed to create temp directory."
TMPFILE="${TMPDIR}/batch-file-temp"
TMP_LIBRARY_FILE="${TMPDIR}/redshift_utils.py"
TMP_PYTHON_FILE="${TMPDIR}/redshift_etl_demo.py"
install -m 0600 /dev/null "${TMPFILE}" || error_exit "Failed to create temp file."
install -m 0600 /dev/null "${TMP_LIBRARY_FILE}" || error_exit "Failed to create temp python library file."
install -m 0600 /dev/null "${TMP_PYTHON_FILE}" || error_exit "Failed to create temp python file."

info_print "BATCH_FILE_S3_URL ${BATCH_FILE_S3_URL}"

# Fetch and run a script
fetch_and_run_script () {
  # Create a temporary file and download the script
  aws s3 cp "${BATCH_FILE_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMPFILE}" || error_exit "Failed to download S3 script."

  # Make the temporary file executable and run it with any given arguments
  local script="./${1}"; shift
  chmod u+x "${TMPFILE}" || error_exit "Failed to chmod script."
  exec ${TMPFILE} "${@}" || error_exit "Failed to execute script."
}

# Download a zip and run a specified script from inside
fetch_and_run_zip () {
  # Create a temporary file and download the zip file
  aws s3 cp "${BATCH_FILE_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMPFILE}" || error_exit "Failed to download S3 zip file from ${BATCH_FILE_S3_URL}"

  # Create a temporary directory and unpack the zip file
  cd "${TMPDIR}" || error_exit "Unable to cd to temporary directory."
  unzip -q "${TMPFILE}" || error_exit "Failed to unpack zip file."

  # Use first argument as script name and pass the rest to the script
  local script="./${1}"; shift
  [ -r "${script}" ] || error_exit "Did not find specified script '${script}' in zip from ${BATCH_FILE_S3_URL}"
  chmod u+x "${script}" || error_exit "Failed to chmod script."
  exec "${script}" "${@}" || error_exit " Failed to execute script."
}

# Fetch and run a script
fetch_and_run_psql_script () {
  # Create a temporary file and download the psql script
  aws s3 cp "${BATCH_FILE_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMPFILE}" || error_exit "Failed to download S3 script."
  # Create a temporary file and download the sql file
  TMPSQLFILE="${TMPDIR}/sql-file-temp"
  install -m 0600 /dev/null "${TMPSQLFILE}" || error_exit "Failed to create temp psql file."
  aws s3 cp "${BATCH_FILE_SQL_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMPSQLFILE}" || error_exit "Failed to download psql S3 script."
  # Make the temporary file executable and run it with any given arguments
  local script="./${1}"; shift
  chmod u+x "${TMPFILE}" || error_exit "Failed to chmod script."
  echo ${TMPFILE} "${@}" "-f" "${TMPSQLFILE}"
  exec ${TMPFILE} "${@}" "${TMPSQLFILE}" || error_exit "Failed to execute script."
}

# Fetch and run a script
fetch_and_run_python_script () {
  # Create a temporary file and download the python script
  aws s3 cp "${BATCH_FILE_LIBRARY_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMP_LIBRARY_FILE}" || error_exit "Failed to download S3 python library script."
  aws s3 cp "${BATCH_FILE_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMP_PYTHON_FILE}" || error_exit "Failed to download S3 python script."
  # Create a temporary file and download the sql file
  TMPSQLFILE="${TMPDIR}/sql-file-temp"
  install -m 0600 /dev/null "${TMPSQLFILE}" || error_exit "Failed to create temp sql file."
  aws s3 cp "${BATCH_FILE_SQL_S3_URL}" --region "${S3_BUCKET_REGION}" - > "${TMPSQLFILE}" || error_exit "Failed to download S3 sql script."
  # Make the temporary file executable and run it with any given arguments
  local script="./${1}"; shift
  chmod u+x "${TMP_LIBRARY_FILE}" || error_exit "Failed to chmod python library script."
  chmod u+x "${TMP_PYTHON_FILE}" || error_exit "Failed to chmod python script."
  which python3
  echo "${PYTHON_PARAMS}"
  PYTHONCMD="python3 ${TMP_PYTHON_FILE} -s ${TMPSQLFILE} -f ${PYTHON_PARAMS}"
  echo ${PYTHONCMD}
  exec ${PYTHONCMD} "${@}" || error_exit "Failed to execute python script."
}

# Main - dispatch user request to appropriate function
case ${BATCH_FILE_TYPE} in
  zip)
    if [ ${#@} -eq 0 ]; then
      usage "zip format requires at least one argument - the script to run from inside"
    fi
    fetch_and_run_zip "${@}"
    ;;

  script)
    fetch_and_run_script "${@}"
    ;;
    
  script_psql)
    fetch_and_run_psql_script "${@}"
    ;;
    
  script_python)
    fetch_and_run_python_script "${@}"
    ;;

  *)
    usage "Unsupported value for BATCH_FILE_TYPE. Expected (zip/script/script_psql/script_python)."
    ;;
esac
