#!/bin/sh
# Requires curl and jq
(
  echo '['
  curl -s "https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist/00100" | jq '.[0]'
  echo ']'
) > ./contracts.import.json
