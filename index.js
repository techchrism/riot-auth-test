const readline = require('readline');
const Writable = require('stream').Writable;
const winston = require('winston');
const path = require('path');
const esmImport = require('esm')(module);
const {CookieJar, fetch} = esmImport('node-fetch-cookies');

async function getCreds()
{
    // "Safe" input from https://stackoverflow.com/a/33500118
    const mutableStdout = new Writable({
        write: function(chunk, encoding, callback)
        {
            if (!this.muted)
                process.stdout.write(chunk, encoding);
            callback();
        }
    });
    mutableStdout.muted = false;
    const rl = readline.createInterface({
        input: process.stdin,
        output: mutableStdout,
        terminal: true
    });
    
    return new Promise(resolve =>
    {
        rl.question('Riot username: ', username =>
        {
            rl.question('Riot password: ', password =>
            {
                rl.close();
                console.log('');
                resolve({username, password});
            });
            mutableStdout.muted = true;
        });
    })
}

function createLogger()
{
    const {combine, timestamp, label, printf} = winston.format;
    const formatPrint = printf(({ level, message, label, timestamp }) => {
        return `${timestamp} [${level}]: ${message}`;
    });
    const format = combine(
        label({ label: '' }),
        timestamp(),
        formatPrint
    );
    return winston.createLogger({
        level: 'info',
        format,
        defaultMeta: {service: 'user-service'},
        transports: [
            new winston.transports.File({filename: path.join(__dirname, 'logs', 'error.log'), level: 'error'}),
            new winston.transports.File({filename: path.join(__dirname, 'logs', 'combined.log')}),
            new winston.transports.Console({level: 'info', format})
        ],
    });
}

async function login({username, password}, jar)
{
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': ''
    };
    // Set up cookies for auth request
    await (await fetch(jar, 'https://auth.riotgames.com/api/v1/authorization', {
        method: 'POST',
        body: '{"client_id":"play-valorant-web-prod","nonce":"1","redirect_uri":"https://playvalorant.com/opt_in","response_type":"token id_token"}',
        headers
    })).text();
    
    // Perform auth request
    const authResponse = await (await fetch(jar, 'https://auth.riotgames.com/api/v1/authorization', {
        method: 'PUT',
        body: JSON.stringify({
            type: 'auth',
            username,
            password
        }),
        headers
    })).json();
    
    if(authResponse['error'] === 'auth_failure')
    {
        throw new Error('Invalid Riot username or password');
    }
    
    const hash = (new URL(authResponse['uri'])).hash;
    const searchParams = new URLSearchParams(hash.slice(1));
    return {
        accessToken: searchParams['access_token'],
        expiresIn: searchParams['expires_in']
    };
}

(async () =>
{
    const logger = createLogger();
    
    logger.info('Getting credentials');
    const creds = await getCreds();
    logger.info(`Username: ${creds.username}`);
    
    logger.info('Logging in...');
    const jar = new CookieJar(path.join(__dirname, 'cookies', 'jar.json'));
    let loginData;
    try
    {
        loginData = await login(creds, jar);
    }
    catch(e)
    {
        logger.error('Login failed');
        logger.error(e.toString());
        return;
    }
    logger.info(`Got token: ${loginData.accessToken}`);
    logger.info(`Expires in ${loginData.expiresIn} seconds`);
    
})();