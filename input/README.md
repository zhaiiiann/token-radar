# The token-radar snapshot

`snapshot.json` in this directory is the frozen protocol data your entry reads. The house fetched it once from DefiLlama's public API, when it built this competition's input, and every run of your entry and the grade itself read the same bytes. It does not move under you and it is not updated: treat it as read-only.

The `source` field names the endpoint and the exact fetch time; `as_of` is that fetch's UTC date.

## The file

| Key | Type | Meaning |
| --- | --- | --- |
| `as_of` | string, `YYYY-MM-DD` | The UTC date of the fetch. |
| `source` | string | `DefiLlama https://api.llama.fi/protocols, fetched <ISO datetime>`: where the data came from, and when. |
| `floor_usd` | number | The watchlist's floor in whole US dollars. This snapshot's is $50,000,000. |
| `protocols` | object[] | Every protocol at or above $5,000,000 of TVL, one object each, sorted by `slug` ascending. A protocol under $5,000,000, or one DefiLlama gives no slug, name or TVL for, is not in the file. |
| `watchlist` | string[] | The `slug` of every protocol that meets the watchlist's definition below, ascending. |

Every object in `protocols` carries exactly these ten fields, and no others.

| Field | Type | Meaning |
| --- | --- | --- |
| `slug` | string | DefiLlama's slug for the protocol. It is unique in the file, and `watchlist` names protocols by it. |
| `name` | string | The protocol's name as DefiLlama writes it. |
| `category` | string or null | DefiLlama's category, such as `Dexs`, `Lending` or `Bridge`; null when it names none. |
| `chains` | string[] | The chains DefiLlama counts the protocol's TVL on, as it names them (`Ethereum`, `Solana`, `Base` and so on). |
| `tvl_usd` | number | The protocol's TVL in whole US dollars, truncated toward zero, never rounded up. |
| `change_7d` | number or null | Its TVL's change over 7 days, in per cent: `12.5` is +12.5% and `-4` is -4%. Rounded to 4 decimal places. null when DefiLlama reports none. |
| `mcap_usd` | number or null | The market cap of its token in whole US dollars, truncated toward zero; null when it records no token or no market cap. |
| `listed_at` | string, `YYYY-MM-DD`, or null | The UTC day DefiLlama began tracking the protocol; null when it reports none. |
| `gecko_id` | string or null | Its token's CoinGecko id; null when it records no token. |
| `symbol` | string or null | Its token's ticker; null when it records no token. DefiLlama's `-` placeholder is written as null. |

## The watchlist

`watchlist` holds the `slug` of every protocol in `protocols` that:

- has a `tvl_usd` at or above `floor_usd`;
- records no token: both `gecko_id` and `symbol` are null;
- has a `name` that does not end in a version marker, a space followed by `V2`, `v2`, `2.0` or the like (the pattern `\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$`);
- is not a wrapped, staked or bridged product of another protocol: DefiLlama records no parent protocol (`parentProtocol`) for it, its `category` is not `Bridge`, `Canonical Bridge`, `Liquid Staking`, `Liquid Restaking`, `Restaked BTC` or `CEX`, and its `name` carries no whole word `wrapped`, `staked` or `staking` in any case and does not begin with an exchange's name (`Binance`, `Coinbase`, `Bybit`, `Kraken`, `Bitget`, `OKX`, `Bitfinex`, `Gemini`).

A wrapped or staked product of a token that already trades is not a token that does not exist yet: WBTC is Bitcoin on Ethereum, Binance staked ETH is ETH in Binance's staking product, and neither is a protocol still waiting on a launch of its own. `parentProtocol` is not one of the ten fields this file carries; the list is what the rule produced from DefiLlama's record, and it is the list your entry reads.

It is a floor, never a ceiling. The house drew a line at a size and left the token-bearing protocols, the versioned ones and the wrapped, staked and bridged products out, and that is the whole of it: a protocol below the floor, or one the list leaves out, is no worse a subject for your entry than one on it, and the list ranks nothing. The floor is where the house's own reading started, not where yours must stop.

## What is not here

The snapshot carries no ranking, no implied value, no farm plan and no airdrop flag. It does not say which protocol is worth your time, which one may issue a token, what that token may be worth or what to do about any of it: there is no score, no yield, no strategy and no signal in the file. Deriving them is the entry's work.
