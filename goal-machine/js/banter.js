/* Goal Machine – a line of daily banter about your club on the home page (in place of the "5,000+ players" line).
   Good-natured wind-ups, never nasty. A new one each day (the same for every fan of that club). */
'use strict';

(function () {
  const CLUBS = {
    'Arsenal': ['Is this the year? It’s always the year.', 'Invincible once. Very vincible since.', 'Your XI would pass it into the net. Eventually.', 'Top four is a trophy, apparently.'],
    'Aston Villa': ['1982 was a long time ago, but they still mention it.', 'Villa Park: great ground, greater nostalgia.', 'Holte End ready. Squad… possibly.'],
    'Chelsea': ['New manager this week? Check back tomorrow.', 'Spending £1bn to finish mid-table takes real talent.', 'The loan army could field its own league.'],
    'Everton': ['Still waiting for that trophy, eh?', 'The People’s Club. The people are tired.', 'Great Escape artists since 1994.', 'New stadium, same nerves.'],
    'Liverpool': ['Let’s talk about 2020. Every day. Forever.', 'Six European Cups and one famous slip.', 'You’ll never walk alone. You might slip, though.'],
    'Manchester City': ['Noisy neighbours, quiet trophy cabinet? Not any more.', 'Remember when you were the noisy neighbours?', 'Enjoy it. It hasn’t always been like this.'],
    'Manchester United': ['Still living off Fergie time.', 'Is it rebuild number seven or eight now?', 'Theatre of Dreams. Mostly nightmares lately.', 'Twenty titles. Mention it again, go on.'],
    'Newcastle United': ['Money now. Trophies… pending.', 'Howay! The wait goes on, but the vibes are good.', 'Keegan would love it. He’d really love it.'],
    'Tottenham Hotspur': ['Lovely stadium. Lovely cheese room. Trophies?', 'It’s the hope that kills you.', 'Spursy is a word now. You made it.'],
    'West Ham United': ['Forever blowing bubbles, and leads.', 'The academy of football. Graduated with honours in chaos.', 'Europe winners, don’t you forget it. They won’t let you.'],
    'Leeds United': ['Marching on together, usually back to the Championship.', 'Living the dream? More like living in 2001.', 'Dirty Leeds. Your XI had better be too.'],
    'Leicester City': ['5000–1 once. Now back to 5000–1.', 'The fairytale was real. The sequel wasn’t.', 'Dilly ding, dilly dong.'],
    'Southampton': ['The best academy in the league. For everyone else’s squads.', 'You sell them, Liverpool plays them.'],
    'Crystal Palace': ['The loudest fans in the league, and they need to be.', 'Eagles soar. Occasionally.'],
    'Brighton and Hove Albion': ['Sell high, buy smart, repeat forever.', 'Seagulls: always nicking something.'],
    'Wolverhampton Wanderers': ['Portugal’s second-best league team.', 'Molineux under the lights. Magic, sometimes.'],
    'Fulham': ['Cottage by the river, yo-yo by nature.', 'Nice ground. Nice people. Nice… that’s it.'],
    'Brentford': ['Moneyball, the Bees’ Knees.', 'Set pieces are a lifestyle.'],
    'AFC Bournemouth': ['A stadium smaller than some away ends.', 'The Cherries keep punching above their weight.'],
    'Nottingham Forest': ['Two European Cups. Mention them again.', 'Bought a whole team. Twice.'],
    'Sunderland': ['Til I die. Sometimes it feels that way.', 'The Stadium of Light, and occasional darkness.'],
    'Burnley': ['Up, down, up. Keep the lift running.', 'Long ball? Proper football, that is.'],
    'Blackburn Rovers': ['Champions in 1995. We checked, it happened.', 'Jack Walker money built that. Remember?'],
    'Middlesbrough': ['A League Cup and a lot of stories about Juninho.', 'Smoggies, never forget Ravanelli’s shirt over his head.'],
    'Stoke City': ['Can they do it on a cold, wet Tuesday?', 'Long throws: a lost art, still missed.'],
    'West Bromwich Albion': ['Boing boing, then down again.', 'The Great Escape of 2005. You were there, probably.'],
    'Norwich City': ['Let’s be ’aving you! Then relegated.', 'Delia would like a word.'],
    'Watford': ['Managers get a season. Maybe.', 'Elton’s club. Still standing.'],
    'Ipswich Town': ['Sir Bobby’s club. Sir Alf’s too.', 'Tractor Boys, long road back.'],
    'Bolton Wanderers': ['Big Sam’s Bolton. They’d have beaten your lot.', 'Okocha was so good they named him twice.'],
    'Wigan Athletic': ['FA Cup winners AND relegated. Same season.', 'Pies, rugby and a Cup final.'],
    'Portsmouth': ['FA Cup winners, then chaos. Fitting for this game.', 'FA Cup winners in 2008. They’ll tell you.'],
    'Queens Park Rangers': ['Harry’s wheeler-dealing, remember?', 'Loftus Road: small ground, big dreams.'],
  };
  const GENERIC = [
    c => `A ${c} fan? Bold of you to admit that on the home screen.`,
    c => `Supporting ${c}: character-building, apparently.`,
    c => `${c} fans, already making excuses for this XI.`,
    c => `Your XI can’t be worse than ${c}’s back four. Surely.`,
    c => `Another day supporting ${c}. Stay strong.`,
    c => `${c}: loyal fans, questionable signings.`,
  ];

  GM.clubBanter = function (club) {
    const own = CLUBS[club] || [], all = own.map(t => () => t).concat(GENERIC);
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
    // own lines come up more often than the general ones
    const pick = own.length && day % 3 !== 2 ? own[(day >> 1) % own.length] : GENERIC[day % GENERIC.length](club);
    return typeof pick === 'function' ? pick() : pick;
  };
})();
