Primary Word should have at least six rhyming words
Secondary Word should have at least six rhyming words


A1 sentence
A2 sentence

5 a
6 b


1) Get list of random words from Wordnik

2) For each word, get list of all rhyming words.
Discard any words that begin wtih capital letters.
If remaining words >= 10, consider word a good candidate and save.

Save word and associated rhyming words.


3) Search twitter for 


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

---------------------------


Clean up and ignore tweets like this:
---------------------------
'Doff tried and true together with nonmandatory routinized ads without dealplus: SwRtgriKh'
'Pass999 000-m31 oral examination rote guides: uWF'
'Doff a Mind Before Going to Reach Wholesale Handbags...SAbRt',
'Designer Soft Rig - Doff the Best for Your Accessible...sXVZ',

'"We  rote our first blog post before we wrote our first line of code." -Jon Mille'

