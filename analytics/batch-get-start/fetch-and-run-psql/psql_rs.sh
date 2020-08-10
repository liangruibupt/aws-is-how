PATH="/bin:/usr/bin:/sbin:/usr/sbin:/usr/local/bin:/usr/local/sbin"
BASENAME="${0##*/}"

# Standard function to print an error and exit with a failing return code
error_exit () {
  echo "${BASENAME} - ${1}" >&2
  exit 1
}

export PGPASSWORD=${REDSHIFT_PASSWORD}
PSQLCMD="psql -h ${REDSHIFT_ENDPOINT} -p ${REDSHIFT_PORT} -d ${REDSHIFT_DBNAME} -U ${REDSHIFT_USER} -v ON_ERROR_STOP=1 -v s3dataloc=${S3_DATA_LOC} -v s3datareadrole=${S3_DATA_READ_ROLE}  -v dt=${DATASET_DATE} -f $1"
echo ${PSQLCMD}
exec ${PSQLCMD} "${@}" || error_exit "Failed to execute psql script."
