# Riot Auth Test
Hacky project to test stability of generating new tokens from login cookies instead of re-authenticating

Uses <https://valapidocs.techchrism.me/endpoint/cookie-reauth> with different sets of cookies.

Tests are run every 15 minutes.
If a test fails 10 times in a row, it will be skipped continually until the script is restarted.
This is to prevent repeated auth attempts with known-bad cookies.
In previous tests, a failed test might pass again on the next attempt for unknown reasons (cache? different request handlers?) hence the allowance of 10 consecutive failures.

## Version 2

V2 uses reauthentication from both the web flow and the Riot client flow.
It uses three sets of cookies:
 - cookies generated from the web login
 - cookies generated from the Riot client to be used exclusively for Riot client reauth
 - cookies generated from the Riot client to be used for both Riot client and web reauth

The reason for a separate set of cookies for Riot client reauth is that I have observed cookies generated from the
Riot client to have a shorter lifespan when used with web reauth. I have also observed older cookies from the Riot client
unable to be used with web reauth.

### Tests being run:
 - Original Web Cookies - Web Reauth
 - Original Riot Cookies - Riot Reauth
 - Refreshed cookies - web using web reauth
 - Refreshed cookies - riot using riot reauth
 - Refreshed cookies - riot secondary using riot reauth
 - Refreshed cookies - riot secondary using web reauth

### Results

#### 2024-01-28
 - Started V2 tests, currently all passing


## Version 1

### Tests being run:
 - Original Cookies
   - Always attempts reauth with the same set of cookies provided on launch
 - Original SSID
   - Always attempts reauth with just the `ssid` cookie provided on launch
 - Refreshed Cookies
   - Attempts reauth storing the cookies from the last result to use in the next request
 - Refreshed SSID
   - Attempts reauth storing just the `ssid` cookie from the last result to use in the next request

### Results

#### 2023-11-18
 - Started the test with cookies grabbed from a web login

#### 2023-11-19
 - All tests still passing
 - Some tests will occasionally fail, but pass on the next attempt
   - The most common to fail is the "Refreshed SSID" test
   - Once the tests have been running for a bit longer, I'll publish failure rates

#### 2023-11-29
 - The "Refreshed Cookies" test is still passing
 - On `2023-11-26T04:04:15.178Z`, all the tests except the "Refreshed Cookies" began failing
   - The first tests ran were on `2023-11-19T06:33:23.048Z` (and the original cookies were generated slightly before this) which marks about one week of successful tests before failure
   - This would seem to indicate that storing and refreshing just the `ssid` cookie is not long-term stable
 
#### 2023-12-11
 - All tests are now consistently failing
 - Test history can be found at <https://gist.github.com/techchrism/62571ec5a8b28bd757eec0f8b0d33ea3>

Failure rates and eventual failure times:
```
Original Cookies
   Passed: 614 (93%)
   Failed: 48 (7%)
   Longest failure chain: 2
   Time until consistent failure: 7.012 days
Original SSID
   Passed: 619 (94%)
   Failed: 43 (6%)
   Longest failure chain: 2
   Time until consistent failure: 7.012 days
Refreshed SSID
   Passed: 603 (91%)
   Failed: 58 (9%)
   Longest failure chain: 2
   Time until consistent failure: 7.002 days
Refreshed Cookies
   Passed: 1834 (91%)
   Failed: 172 (9%)
   Longest failure chain: 2
   Time until consistent failure: 21.011 days
```
