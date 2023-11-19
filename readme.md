# Riot Auth Test
Hacky project to test stability of generating new tokens from login cookies instead of re-authenticating

Uses <https://valapidocs.techchrism.me/endpoint/cookie-reauth> with different sets of cookies.

Tests are run every 15 minutes.
If a test fails 10 times in a row, it will be skipped continually until the script is restarted.
This is to prevent repeated auth attempts with known-bad cookies.
In previous tests, a failed test might pass again on the next attempt for unknown reasons (cache? different request handlers?) hence the allowance of 10 consecutive failures.

## Tests being run:
 - Original Cookies
   - Always attempts reauth with the same set of cookies provided on launch
 - Original SSID
   - Always attempts reauth with just the `ssid` cookie provided on launch
 - Refreshed Cookies
   - Attempts reauth storing the cookies from the last result to use in the next request
 - Refreshed SSID
   - Attempts reauth storing just the `ssid` cookie from the last result to use in the next request

## Results

### 2023-11-18
 - Started the test with cookies grabbed from a web login

### 2023-11-19
 - All tests still passing
 - Some tests will occasionally fail, but pass on the next attempt
   - The most common to fail is the "Refreshed SSID" test
   - Once the tests have been running for a bit longer, I'll publish failure rates