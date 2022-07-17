#!/bin/bash


LOG_FILE="/home/ubuntu/cronLogs"
NOW=$(date +%m-%d-%Y)
S3_PATH="s3://terraform-splintersuite-api-logs-staging/cronLogs/$NOW"

export AWS_PROFILE=splintersuite-api-staging

cd $LOG_FILE || exit 

aws s3 cp $LOG_FILE/ $S3_PATH --exclude "*" --include "*.log" || exit

exit 0;