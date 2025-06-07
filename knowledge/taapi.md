[GET] REST – Direct
You can query the API with a simple GET request. All that is needed is to send your request to: https://api.taapi.io with at least the mandatory parameters. Additionally, this is the endpoint you need for fetching historical data.

Pros
Easy to get started
Works with NodeJS, PHP, Python, Ruby, Curl or via browser
Historical data
Getting started
To get started, simply make an HTTPS GET Request or call in your browser:

GET
https://api.taapi.io/rsi?secret=API_KEY&exchange=binance&symbol=BTC/USDT&interval=1h
A JSON Response is returned:

{
  "value": 69.8259211745199
}
Mandatory Parameters
Our Direct method requires these parameters:

Parameter	Type	Description
secret	String	The secret which is emailed to you when you Request an API key.
exchange	String	The exchange you want to calculate the indicator from: binance, binancefutures or one of our supported exchanges. Mandatory for type=crypto only.
symbol	String	Symbol names are always uppercase, with the coin separated by a forward slash and the market: COIN/MARKET. For example: BTC/USDT Bitcoin to Tether, or LTC/BTC Litecoin to Bitcoin…
interval	String	Interval or time frame: We support the following time frames: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 12h, 1d, 1w. So if you’re interested in values on hourly candles, use interval=1h, for daily values use interval=1d, etc.
Depending on the indicator you call, there may or may not be more mandatory parameters. Additionally, there may be several other optional paramters, also depending on the indicator. Please refer to the Indicators page for more information.

Optional Parameters
Below is a list of optional parameters that all the indicators will take:

Parameter	Type	Description
backtrack	Integer	The backtrack parameter removes candles from the data set and calculates the indicator value X amount of candles back. So, if you’re fetching an indicator on the hourly and you want to know what the indicator value was 5 hours ago, set backtrack=5. The default is 0 and a maximum is 50.
chart	String	The chart parameter accepts one of two values: candles or heikinashi. candles is the default, but if you set this to heikinashi, the indicator values will be calculated using Heikin Ashi candles.
type	String	[crypto, stocks] – defaults to ‘crypto’. This tells which asset class you’re querying.
results	Int/”max”	The number of indicator results to be returned. Ex. 20 will return the last 20 RSI results, for instance. Setting max as a string will return either every historical data point available or the max allowed by your plan.
addResultTimestamp	Boolean	[true,false] – defaults to false. By setting to true the API will return a timestamp with every result (real-time and historical) to which candle the value corresponds. This is helpful when requesting historical data.
gaps	Boolean	[true, false] – defaults to true. By setting to false, the API will ensure that there are no candles missing. This often happens on lower timeframes in thin markets. Gaps will be filled by a new candle with 0 volume, and OHLC set the the close price of the latest candle with volume.
Headers
Some REST clients may need to be told explicitly which headers to use. Add these headers to the requests if the responses doesn’t match the expected output.

Key	Value	Description
Content-Type	application/json	The Content-Type representation header is used to indicate the original media type of the resource (prior to any content encoding applied for sending).
Accept-Encoding	application/json	The Accept-Encoding request HTTP header indicates the content encoding (usually a compression algorithm) that the client can understand. The server uses content negotiation to select one of the proposals and informs the client of that choice with the Content-Encoding response header.
Tools & Wrappers
TAAPI.IO comes with a variety of 3rd party integrations and wrappers, some of which includes NPM, PHP and ‘no-code’ integrations such as Make. Please take a moment to go through this list Utilities / 3rd party integrations.

Examples
Below you’ll find some examples, how to connect, authenticate and query the API:

NodeJS
Javascript is a great language for coding bots, and using the NodeJS package makes it even simpler. Please refer to the NPM | NodeJS | TypeScript guide for detailed guidelines on this. Or simply call taapi directly using Axios.

NPM - CommonJS
// Require taapi (using the NPM client: npm i taapi --save)
const Taapi = require("taapi");
 
// Setup client with authentication
const taapi = new Taapi.default("TAAPI_SECRET");
 
taapi.getIndicator("rsi", "BTC/USDT", "1h").then( rsi => {
    console.log(rsi);
});
NPM - TypeScript
// Import
import Taapi from 'taapi';

// Init taapi
const taapi = new Taapi("TAAPI_SECRET");

taapi.getIndicator("rsi", "BTC/USDT", "1h").then( rsi => {
    console.log(rsi);
});
NPM - Stocks
// Import
import Taapi from 'taapi';

// Init taapi
const taapi = new Taapi("TAAPI_SECRET");

taapi.getIndicator("rsi", "AAPL", "1h", {
    type: "stocks",
}).then( rsi => {
    console.log(rsi);
});
Axios
// Require axios: npm i axios
var axios = require('axios');

axios.get('https://api.taapi.io/rsi', {
  params: {
    secret: "TAAPI_SECRET",
    exchange: "binance",
    symbol: "BTC/USDT",
    interval: "1h",
  }
})
.then(function (response) {
  console.log(response.data);
})
.catch(function (error) {
  console.log(error.response.data);
});
PHP
Use the built in tools in PHP and make CURL request, or use Packagist.org | PHP Composer to make life easier.

Packagist.org | PHP Composer
<?php

// Require taapi single
require 'vendor/taapi/php-client/single.php';

// Init taapi
$taapi = new TaapiSingle("TAAPI_SECRET");

// Calculate indicator
$result = $taapi->execute("rsi", "binance", "BTC/USDT", "1h", array(
    "period" => 200,
    "backtrack" => 1
));

// Print result
echo "RSI: $result->value";
Native PHP
<?php

$endpoint = 'rsi';

$query = http_build_query(array(
  'secret' => 'TAAPI_SECRET',
  'exchange' => 'binance',
  'symbol' => 'BTC/USDT',
  'interval' => '1h'
));

// Define endpoint
$url = "https://api.taapi.io/{$endpoint}?{$query}";

// create curl resource 
$ch = curl_init(); 

// set url 
curl_setopt($ch, CURLOPT_URL, $url); 

//return the transfer as a string 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); 

// $output contains the output string 
$output = curl_exec($ch); 

// close curl resource to free up system resources 
curl_close($ch);

// View result
print_r(json_decode($output));
Python
Python
# Import the requests library 
import requests 

# Define indicator
indicator = "rsi"
  
# Define endpoint 
endpoint = f"https://api.taapi.io/{indicator}"
  
# Define a parameters dict for the parameters to be sent to the API 
parameters = {
    'secret': 'TAAPI_SECRET',
    'exchange': 'binance',
    'symbol': 'BTC/USDT',
    'interval': '1h'
    } 
  
# Send get request and save the response as response object 
response = requests.get(url = endpoint, params = parameters)
  
# Extract data in json format 
result = response.json() 

# Print result
print(result)
Ruby
Ruby
require 'net/http'
uri = URI("https://api.taapi.io/rsi?secret=TAAPI_SECRET&exchange=binance&symbol=BTC/USDT&interval=1h")
puts Net::HTTP.get(uri)
Curl
Curl
curl "https://api.taapi.io/rsi?secret=TAAPI_SECRET&exchange=binance&symbol=BTC/USDT&interval=1h"
That’s it!
As always, feedback, comments are greatly appreciated!

---
Average True Range
Get started with the atr
Simply make an HTTPS [GET] request or call in your browser:

			
[GET] https://api.taapi.io/atr?secret=MY_SECRET&exchange=binance&symbol=BTC/USDT&interval=1h

		
API response
The atr endpoint returns a JSON response like this:

			
{
  "value": 728.0261823315979
}

		
Example response from TAAPI.IO when querying atr endpoint.
API parameters
secret
Required String
The secret which is emailed to you when you request an API key.
exchange
Required String
The exchange you want to calculate the indicator from: binance, binancefutures or one of our supported exchanges. For other crypto / stock exchanges, please refer to our Client or Manual integration methods.
symbol
Required String
Symbol names are always uppercase, with the coin separated by a forward slash and the market: COIN/MARKET. For example: BTC/USDT Bitcoin to Tether, or LTC/BTC Litecoin to Bitcoin...
interval
Required String
Interval or time frame: We support the following time frames: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 12h, 1d, 1w. So if you're interested in values on hourly candles, use interval=1h, for daily values use interval=1d, etc.
backtrack
Optional Integer
The backtrack parameter removes candles from the data set and calculates the atr value X amount of candles back. So, if you are fetching the atr on the hourly and you want to know what the atr was 5 hours ago, set backtrack=5. The default is 0.
chart
Optional String
The chart parameter accepts one of two values: candles or heikinashi. candles is the default, but if you set this to heikinashi, the indicator values will be calculated using Heikin Ashi candles. Note: Pro & Expert Plans only.
addResultTimestamp
Optional Boolean
true or false. Defaults to false. By setting to true the API will return a timestamp with every result (real-time and backtracked) to which candle the value corresponds. This is especially helpful when requesting a series of historical values using the results parameter.
fromTimestamp
New Optional String
The start of the time range in Unix epoch time. For example: 1685577600
toTimestamp
New Optional String
The end of the time range in Unix epoch time. For example: 1731456000 If you only use fromTimestamp, the API will return all results from that time until present.
gaps
Optional Boolean
true or false. Defaults to true. By setting to false, the API will ensure that there are no candles missing. This often happens on lower timeframes in thin markets. Gaps will be filled by a new candle with 0 volume, and OHLC set the the close price of the latest candle with volume.
results
New Optional String
number or max. Use this parameter to access historical values on the past X candles until the most recent candle. Use max to return all available historical values. Returns an array with the oldest value on top and most recent value returned the last.
period
Optional Integer
The amount of candles used in the calculation (ATR length).

Default: 14

More examples
Let's say you want to know the atr value on the last closed candle on the 30m timeframe. You are not interest in the real-time value, so you use the backtrack=1 optional parameter to go back 1 candle in history to the last closed candle.

				
[GET] https://api.taapi.io/atr?secret=MY_SECRET&exchange=binance&symbol=BTC/USDT&interval=30m&backtrack=1

			
Get atr values on each of the past X candles in one call
Let's say you want to know what the atr daily value was each day for the previous 10 days. You can get this returned by our API easily and efficiently in one call using the results=10 parameter:

				
[GET] https://api.taapi.io/atr?secret=MY_SECRET&exchange=binance&symbol=BTC/USDT&interval=1d&results=10

			
Looking for even more integration examples in different languages like NodeJS, PHP, Python, Curl or Ruby? Continue to [GET] REST - Direct documentation.

