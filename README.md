# Betty

## Submitting a Bet
Bets are submitted using the following steps
1. Submit a payment to the specified multisig address
2. Payments must include a memo field and a tag in the following format
```
  memo: '{ side: side, amount: amount }'
  tag: '<matchId>'
```
3. If the bet is not of the specified format the bet will be denied and funds
   returned
