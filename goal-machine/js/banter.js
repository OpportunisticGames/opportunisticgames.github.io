/* Goal Machine – a line of daily banter about your club on the home page (in place of the "5,000+ players" line).
   Rage-bait and football-Twitter memes rather than facts: your club's own, your rivals' (so Evertonians get to see
   "Sadio Mané is the best player in the werrrld" some days) and league-wide ones everyone gets.
   The rule: wind-ups about football only. Never tragedies, deaths, race, or anyone's private life.
   A new line each day, the same for every fan of that club. */
'use strict';

(function () {
  const CLUBS = {
    'Arsenal': ['It’s November and you’re top. Yes, this is the year. Again.', 'Trust the process™ (year 7)', 'The Emirates: the only library with a club shop.', 'Bottle jobs? Us? Check back in May.', 'Second is the new first. Apparently.'],
    'Aston Villa': ['One Champions League run and Villa Twitter thinks it’s 1982.', 'Emi Martínez is doing something to a trophy again.', 'Villa fans are already planning the European away days.'],
    'Chelsea': ['Your goalkeeper just signed a nine-year contract.', 'Chelsea’s squad: 43 midfielders and no striker.', 'Cold Palmer. That’s it, that’s the tweet.', 'New manager announced. Check back Tuesday.', 'Spending £1bn to finish tenth is an art form.'],
    'Everton': ['Everton Twitter Spaces are live: 4,000 listeners, one agenda.', 'I’ve seen enough. Deduct Everton 10 points.', 'Still waiting for that trophy, eh?', 'New stadium, same nerves.', 'Blues fans explaining the xG after losing 1–0 at home.', 'Dixie Dean would have scored 60 in this team.'],
    'Liverpool': ['Sadio Mané is the best player in the werrrld.', 'Allez, allez, allez… in the Europa League.', 'We go again. And again. And again.', 'Liverpool fans still talking about 2005. It was 2005.', 'Unbelievable scenes, according to one LFC TV presenter.'],
    'Manchester City': ['115. That’s the tweet.', 'Innocent until proven 115.', 'Pep’s overthinking it: three at the back, two keepers.', 'Plenty of seats available at the Etihad.', 'Blue Moon, you saw me standing alone. Because nobody else turned up.'],
    'Manchester United': ['Project Youth, year 11.', 'Harry Maguire for the Ballon d’Or.', '“We’re back” (2013–present).', 'Theatre of Dreams. Leaky roof of reality.', 'Ronaldo was right, according to Ronaldo.'],
    'Tottenham Hotspur': ['Spursy.', 'Lads, it’s Tottenham.', 'Harry Kane won a trophy. In Germany.', 'The trophy parade route: straight to the cheese room.', 'It’s the hope that kills you.'],
    'Newcastle United': ['Toon Twitter at 3am: “we’re winning the Champions League”.', 'A trophy! Let them have it. They waited 70 years.', 'Howay the lads, it’s nearly time to panic.'],
    'West Ham United': ['Predicted to finish 8th. Every single season.', 'Forever blowing bubbles. And leads.', 'The London Stadium: bring binoculars.', 'Moyesball: it’s back, it’s beautiful, it’s 1–0.'],
    'Hull City': ['Mauled by the Tigers.', 'Hull City Tigers. Don’t ask.', 'Hull fans still bringing up the FA Cup final. It was 2014.'],
    'Leeds United': ['Leeds fans: “biggest club in the world”. Division: TBC.', 'Marching on together. Mostly back to the Championship.', 'Still dreaming of Bielsa ball.'],
    'Leicester City': ['5000–1 once. Never again.', 'Leicester fans still bringing up 2016 at the pub.', 'PSR? Never heard of her.'],
    'Wolverhampton Wanderers': ['Wolves: a Portuguese club in a West Midlands costume.', 'Wolves fans refreshing Jorge Mendes’ phone.'],
    'Brighton and Hove Albion': ['Brighton: sell them all, buy better ones, repeat forever.', 'Tony Bloom’s spreadsheet runs this club and it’s winning.'],
    'Brentford': ['Set pieces and vibes.', 'Moneyball, but the Bees.'],
    'Crystal Palace': ['Palace fans asking for a Zaha statue. Again.', 'The loudest end in the league. Carrying the team.'],
    'Nottingham Forest': ['Forest’s squad: 57 players and a letter about PSR.', 'Two European Cups. Mention them again, go on.'],
    'AFC Bournemouth': ['A stadium with fewer seats than some away ends.', 'The Cherries: still here, still annoying the big six.'],
    'Southampton': ['Southampton: the best academy in the league, for Liverpool.', '9–0. Twice.'],
    'Sunderland': ['Sunderland ’Til I Die, season 4, coming soon.', 'The Stadium of Light, the Sunderland of darkness.'],
    'Burnley': ['Up, down, up. The Turf Moor lift is always running.', 'Kompany ball, then the Championship.'],
    'Fulham': ['A riverside ground and a yo-yo string.', 'The Cottage: lovely views of the Championship too.'],
    'Norwich City': ['Let’s be ’avin you! (relegated)', 'Delia would like a word.'],
    'Stoke City': ['Can he do it on a cold, wet Tuesday night in Stoke?', 'Long throws: a lost art, still missed.'],
    'West Bromwich Albion': ['Boing boing, bye bye.', 'The Great Escape of 2005, framed on every wall.'],
    'Watford': ['A new manager every time the kettle boils.', 'Elton’s club. Still standing. Barely.'],
    'Ipswich Town': ['Ipswich: up, down, and the tractor still won’t start.', 'Sir Bobby’s club, sir.'],
    'Middlesbrough': ['Boro fans still talking about Juninho. Fair.', 'Ravanelli’s shirt is still over his head somewhere.'],
    'Blackburn Rovers': ['Champions in 1995. Yes, really. Look it up.', 'Jack Walker money, and the trophy to prove it.'],
    'Bolton Wanderers': ['Big Sam’s Bolton would have beaten your lot.', 'Okocha, so good they named him twice.'],
    'Wigan Athletic': ['FA Cup winners and relegated. Same season.'],
    'Portsmouth': ['FA Cup winners in 2008. They’ll tell you.'],
    'Queens Park Rangers': ['’Arry’s wheeler-dealing, remember?'],
    'Sheffield United': ['Two centre-backs overlapping. Innovation.', 'The Blades: sharp for about six weeks.'],
    'Luton Town': ['The Kenilworth Road away end: walk through someone’s garden.'],
  };
  // rivals see each other's memes now and then (Evertonians get "the best player in the werrrld" too)
  const RIVALS = {
    'Everton': ['Liverpool'], 'Liverpool': ['Everton', 'Manchester United'], 'Manchester United': ['Manchester City', 'Liverpool', 'Leeds United'],
    'Manchester City': ['Manchester United'], 'Arsenal': ['Tottenham Hotspur'], 'Tottenham Hotspur': ['Arsenal', 'Chelsea'], 'Chelsea': ['Tottenham Hotspur'],
    'Newcastle United': ['Sunderland'], 'Sunderland': ['Newcastle United'], 'Aston Villa': ['West Bromwich Albion'], 'West Bromwich Albion': ['Wolverhampton Wanderers'],
    'Wolverhampton Wanderers': ['West Bromwich Albion'], 'Brighton and Hove Albion': ['Crystal Palace'], 'Crystal Palace': ['Brighton and Hove Albion'],
    'Leeds United': ['Manchester United'], 'Burnley': ['Blackburn Rovers'], 'Blackburn Rovers': ['Burnley'], 'Norwich City': ['Ipswich Town'], 'Ipswich Town': ['Norwich City'],
    'West Ham United': ['Tottenham Hotspur'], 'Southampton': ['Portsmouth'], 'Portsmouth': ['Southampton'], 'Nottingham Forest': ['Leicester City'], 'Leicester City': ['Nottingham Forest'],
  };
  // everyone gets these
  const LEAGUE = [
    'I’ve seen enough. Deduct Everton 10 points.',
    '115 charges. Just saying.',
    'VAR has checked your XI. No clear and obvious error. Unfortunately.',
    'Big Sam could keep this lot up.',
    'Can your XI do it on a cold, wet Tuesday night in Stoke?',
    'Sadio Mané is the best player in the werrrld.',
    'Lads, it’s Tottenham.',
    'Your mate who supports a “big club” will hate your XI. Good.',
    c => `${c} fans, already making excuses for this XI.`,
    c => `A ${c} fan? Bold of you to admit that on the home screen.`,
  ];

  GM.isDerby = (a, b) => (RIVALS[a] || []).includes(b) || (RIVALS[b] || []).includes(a);

  GM.clubBanter = function (club, dayOffset = 0) {
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5) + dayOffset;
    const salt = [...club].reduce((a, ch) => a + ch.charCodeAt(0), 0);  // clubs don't all get the same kind of line on the same day
    const pick = (list, n) => list[(n >>> 0) % list.length];
    const kind = (day + salt) % 4;  // 0–1: your club's, 2: a rival's, 3: league-wide
    const own = CLUBS[club] || [], rivals = (RIVALS[club] || []).filter(r => CLUBS[r]);
    let line;
    if (kind <= 1 && own.length) line = pick(own, Math.floor(day / 2) + salt);
    else if (kind === 2 && rivals.length) line = pick(CLUBS[pick(rivals, day >> 2)], day + salt);
    else line = pick(LEAGUE, day * 7 + salt);
    return typeof line === 'function' ? line(club) : line;
  };
})();
