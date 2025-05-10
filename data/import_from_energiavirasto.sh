#!/bin/sh
# Requires curl and jq
POSTAL_CODE="${POSTAL_CODE:-00100}"
LIMIT=${LIMIT:-} # return whole array if undefined

expression=".[0:${LIMIT}]"

curl -s "https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist/${POSTAL_CODE}" | jq "${expression}" > ./contracts.import.json
