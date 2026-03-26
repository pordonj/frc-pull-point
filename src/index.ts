import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import request from 'request'
import { promisify } from 'node:util';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set('views', path.join(__dirname, 'templates'))
app.set('view engine', 'ejs')

const footerHtml = `
<footer class="bg-dark text-light py-3 border-top border-secondary">
  <div class="container text-center small">
    <p class="mb-0">Report any issues or incorrect output on <a class="text-info" href="https://github.com/pordonj/frc-pull-point" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
  </div>
</footer>
`

// Home route - HTML
app.get('/', (req, res) => {
  res.render('home', { footerHtml })
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
    res.render('noMatches', { event, footerHtml })
    return;
  }

  var qms = matches.filter(m => m.comp_level == "qm").sort((a, b) => b.match_number - a.match_number).slice(0, Math.ceil(teams.length / 6)).reverse()

  var firstOfLast = qms[0]

  var possibleTeams = firstOfLast.alliances.blue.team_keys.concat(firstOfLast.alliances.red.team_keys)

  var teamsInRest: string[] = []

  for (let i = 1; i < qms.length; i++) {
    teamsInRest = teamsInRest.concat(qms[i].alliances.blue.team_keys)
    teamsInRest = teamsInRest.concat(qms[i].alliances.red.team_keys)
  }

  var teamsToPull = possibleTeams.filter((t: string) => !teamsInRest.includes(t));
  var teamsDisplay = teamsToPull
      .map((t: string) => t.replace(/^frc/i, ''))
      .join(' ');
  res.render('event', { event, firstMatch: String(firstOfLast.match_number), teams: teamsDisplay, footerHtml })
})

export default app