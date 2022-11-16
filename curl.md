curl -s --data '{"jsonrpc":"2.0", "method":"condenser_api.get_transaction", "params":["5f338f82f7805db8480351553b57ba9260ef58c9"], "id":1}' https://api.hive.blog/

curl -s --data '{"jsonrpc":"2.0", "method":"account_history_api.get_account_history", "params":{"account":"xdww", "start":3296, "limit":2, "operation_filter_low": 262144}, "id":1}' https://api.hive.blog/
