FROM ubuntu:latest

# install unzip
RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip \
&& rm -rf /var/lib/apt/lists/*

# install awscli
RUN apt-get update && apt-get install -y --no-install-recommends \
    awscli \
&& rm -rf /var/lib/apt/lists/*

# Add PostgreSQL's repository. It contains the most recent stable release
#     of PostgreSQL, ``9.3``.

RUN apt-get update && apt-get install -y gnupg

RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" > /etc/apt/sources.list.d/pgdg.list

# Add the PostgreSQL PGP key to verify their Debian packages.
# It should be the same key as https://www.postgresql.org/media/keys/ACCC4CF8.asc
RUN apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8


# Install ``python-software-properties``, ``software-properties-common`` and PostgreSQL 9.3
#  There are some warnings (in red) that show up during the build. You can hide
#  them by prefixing each apt-get statement with DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y  postgresql-9.3 postgresql-client-9.3 postgresql-contrib-9.3

ADD fetch_and_run_psql.sh /usr/local/bin/fetch_and_run_psql.sh
WORKDIR /tmp
USER nobody

ENTRYPOINT ["/usr/local/bin/fetch_and_run_psql.sh"]

