Primary Word should have at least six rhyming words
Secondary Word should have at least six rhyming words


A1 
A2 

5 a
6 b

7 a, 6 b
---------------------------

A1 		isRegularLine
b1		isRegularLine
A2 		isRegularLine

a1 		isMultiline
b2		isRegularLine
A1 		isRegularLine

a2 		isMultiline
b3		isRegularLine
A2 		isRegularLine

a3 		isMultiline
b4		isRegularLine
A1 		isRegularLine

a4  	isMultiline
b5 		isRegularLine
A2 		isRegularLine

a5 		isMultiline
b6 		isRegularLine
A1 		isRegularLine
A2 		isRegularLine


arrayA requirements
	isRegularLine = 2 minimum

	Total required is 7

	if there are >= 2 regular lines
		and also >= 7 - regular lines
		arrayA is good to go.

arrayB requirements
	remove all multilines.
	Do we have at least 6?









arrayA = [
	"Do not go gentle into that good night,",
	"Rage, rage against the dying of the light.",
	"Though wise men at their end know dark is right,",
	"Good men, the last wave by, crying how bright",
	"Wild men who caught and sang the sun in flight,",
	"Grave men, near death, who see with blinding sight",
	"And you, my father, there on the sad height,"];

arrayB = [
	"Old age should burn and rave at close of day;",
	"Because their words had forked no lightning they",
	"Their frail deeds might have danced in a green bay,",
	"And learn, too late, they grieved it on its way,",
	"Blind eyes could blaze like meteors and be gay,",
	"Curse, bless me now with your fierce tears, I pray."];


---------------------------

botData.aPhrases = [
	'I AWAIT.',
	'Porra, Douglas. Bate!',
	'Beit!!!!!',
	'Basically Marvel is Jonathan Chait.',
	'Let me see your eyes dilate.',
	'I was just compared to pointer and I\'m elate.',
	'We dug our own graves, we sealed out own fate.',
	'Wait everybody bailing out in bfast fete?',
	'god that shit to my friends before and it\'s great.',
	'Eat healthy ! No guilt even if you overate!',
	'On a scale of 1 to 10, I\'m REALLY overweight.',
	'So who asked MayD to plait??',
	'Anyway to distract and sedate.',
	'I forgot how much I love George Strait.',
	'I AWAIT.',
	'Porra, Douglas. Bate!',
	'Beit!!!!!',
	'Basically Marvel is Jonathan Chait.',
	'Let me see your eyes dilate.',
	'I was just compared to pointer and I\'m elate.',
	'We dug our own graves, we sealed out own fate.',
	'Wait everybody bailing out in bfast fete?',
	'god that shit to my friends before and it\'s great.',
	'Eat healthy ! No guilt even if you overate!',
	'On a scale of 1 to 10, I\'m REALLY overweight.',
	'So who asked MayD to plait??',
	'Anyway to distract and sedate.',
	'I forgot how much I love George Strait.' 
]


[ 'I smell like kool aid.',
  'Buffeted.',
  'Fitness, cade???',
  'Why hasn\'t anybody made a slip n slide at cascade?',
  'yeah///how do I downgrade?',
  'Heya tazaker el safar be balash le sherif fayed..?',
  'SMOKE GRANADE!',
  'Yield thee, so well this day thou hast purveyed.',
  'Yield thee, so well this day thou hast purveyed.',
  'Yield thee, so well this day thou hast purveyed.',
  'Schade.' ]
---------------------------
[ 'TNA  and Indy guys all taking the bait.',
  'call me jail bait!!',
  'Big fish never take the bate...',
  'Basically Marvel is Jonathan Chait.',
  'Let me see your eyes dilate.',
  'Four hundred twenty eight!',
  'I was just compared to pointer and I\'m elate.',
  'Luck is a misjudgment. There is only fate.',
  'Wait everybody bailing out in bfast fete?',
  'Vid up in like 5 mins! Sorry its up late!',
  'Next is queen mate.',
  'Eat healthy ! No guilt even if you overate!',
  'So who asked MayD to plait??',
  'Don\'t hate, procreate.',
  'Mignon\'s going to get sued at this rate.',
  'take a picture you could never recreate.',
  'Anyway to distract and sedate.',
  '3. What\'s your best trait?' ]





var villanelle =
	"<p class=\"tercet\"><a href=\"" + A1.url + "\">" + A1.display + "</a><br />"
	+ "<a href=\"" + b1.url + "\">" + b1.tweet + "</a><br />"
	+ "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>"

	+ "<p class=\"tercet\"><a href=\"" + a1.url + "\">" + a1.tweet + "</a><br />"
	+ "<a href=\"" + b2.url + "\">" + b2.tweet + "</a><br />"
	+ "<a href=\"" + A1.url + "\">" + A1.tweet + "</a></p>"

	+ "<p class=\"tercet\"><a href=\"" + a2.url + "\">" + a2.tweet + "</a><br />"
	+ "<a href=\"" + b3.url + "\">" + b3.tweet + "</a><br />"
	+ "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>"

	+ "<p class=\"tercet\"><a href=\"" + a3.url + "\">" + a3.tweet + "</a><br />"
	+ "<a href=\"" + b4.url + "\">" + b4.tweet + "</a><br />"
	+ "<a href=\"" + A1.url + "\">" + A1.tweet + "</a></p>"

	+ "<p class=\"tercet\"><a href=\"" + a4.url + "\">" + a4.tweet + "</a><br />"
	+ "<a href=\"" + b5.url + "\">" + b5.tweet + "</a><br />"
	+ "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>"

	+ "<p class=\"quatrain\"><a href=\"" + a5.url + "\">" + a5.tweet + "</a><br />"
	+ "<a href=\"" + b6.url + "\">" + b6.tweet + "</a><br />"
	+ "<a href=\"" + A1.url + "\">" + A1.tweet + "</a><br />"
	+ "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>"

