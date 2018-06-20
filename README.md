# Betty

## Submitting a Bet
Bets are submitted using the following steps
1. Submit a payment to the specified multisig address
2. Payments must include a memo field of the specified format
```
  memo: '{ betID: id, side: side, amount: amount }'
```
3. If the bet is not of the specified format the bet will be denied and funds
   returned
