import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import request from 'request'
import { promisify } from 'node:util';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Home route - HTML
app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>FRC PullPoint</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <h1>Welcome to FRC PullPoint!</h1>
        <p>To use, go to <code>[this_url]/[event_code]</code> for any event code that has had its match schedule generated.</p>
        ${getFooter()}
      </body>
    </html>
  `)
})

app.get('/:event', async (req, res) => {
  
  var event = req.params.event;

  const teamsOptions = {
    url: `https://www.thebluealliance.com/api/v3/event/${event}/teams/keys`,
    headers: {
      'X-TBA-Auth-Key': process.env.TBA_KEY
    }
  };

  const matchesOptions = {
    url: `https://www.thebluealliance.com/api/v3/event/${event}/matches/simple`,
    headers: {
      'X-TBA-Auth-Key': process.env.TBA_KEY
    }
  };

  var promiseRequest = promisify(request);

  var teams = JSON.parse((await promiseRequest(teamsOptions)).body);
  var matches = JSON.parse((await promiseRequest(matchesOptions)).body);

  if(matches.length == 0)
  {
    res.type('html').send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>FRC PullPoint - ${event}</title>
          <link rel="stylesheet" href="/style.css" />
        </head>
        <h1>FRC PullPoint - Reinspection for ${event}</h1>
        <body>
          <p>Matches for this event have not yet been generated.</p>
          ${getFooter()}
        </body>
      </html>
    `)
    return;
  }

  var qms = matches.filter(m => m.comp_level == "qm").sort((a, b) => b.match_number - a.match_number).slice(0, Math.ceil(teams.length / 6)).reverse()

  var firstOfLast = qms[0]

  console.log(firstOfLast)

  var possibleTeams = firstOfLast.alliances.blue.team_keys.concat(firstOfLast.alliances.red.team_keys)

  var teamsInRest = []

  for (let i = 1; i < qms.length; i++) {
    teamsInRest = teamsInRest.concat(qms[i].alliances.blue.team_keys)
    teamsInRest = teamsInRest.concat(qms[i].alliances.red.team_keys)
  }

  var teamsToPull = possibleTeams.filter(t => !teamsInRest.includes(t));

  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>FRC PullPoint - ${event}</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <h1>FRC PullPoint - Reinspection for ${event}</h1>
      <body>
        <p>Reinspection starts at match ${firstOfLast.match_number}.</p>
        <p>The following teams will reinspect that match: ${teamsToPull.join(' ')}</p>
        <p>In the remaining matches, reinspect each team.</p>
        ${getFooter()}
      </body>
    </html>
  `)
})

function getFooter() {
  return `
    <footer>
      <p>Report any issues or incorrect output on <a href="https://github.com/pordonj/frc-pull-point">GitHub</a>.</p>
    </footer>
  `;
}

export default app