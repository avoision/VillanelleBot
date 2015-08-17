===========================
Create rules to prevent these lines
===========================

Special characters
---------------------------
Do you dupp&swat?
Free east$ide.
I bet Selena recorded ‘Good For You’ while smoking weed.
    > Check for %2 = 0? Only able to check for double-quotes?
    > Or simply remove anything containing one or more ""?


2-3 Letter Words + Non-English
---------------------------

Wtf is tHis. cHoir?
Anywas je was toch vies.
Excuse sa Performance task hays.
Is et gest meh oar doh peepel hav shet grahmr thees dase?
Sto bi rekli ameri - You can’t fire a cannon from a canoe!
Mall of San Juan sigue en pie?
Overlord vaut le coup ?
Go en mer !
Nelan rase.
Where’s my Mer Mer ?
Get my bffff back. Little mair mair.
David Silva needs to score a Hatrick now ahn ahn.
And idk when it will fade.
My soul is pissed foo .
Hi, I’m Todd Caninequeen. Kaworu was the best eva imo.
Lmfao . I know somebody was gonna say something rude .
My mama ain’t make no Hoe !
I love you Seraaaaaaaah! O, and you too Noel!


===========================
Parsing Tweet
===========================
1) Is word within last 5 words of the tweet?
2) If so, set the following:
	var tweetData = {
		tweet: data.statuses[i].text,
		tweetID: currentTweetID,
	
		isMultiLine = true,
		tweetPrefix = "I have no real plan here. The how",
		tweetSuffix = "of it escapes me." + " "
	
		userID: currentUserID,
		userScreenName: currentUserScreenName,
		url: "http://twitter.com/" + currentUserScreenName + "/status/" + currentTweetID
	};	

3) Length Check: 
	If isMultiLine = false... determine min/max length
	If isMultiLine = true...  determine min/max length


===========================
Building Poem
===========================
1) For "A" phrases - 
	- A1 and A2 cannot be multiline
	- All other A phrases can be multiline.

1) For "B" phrases:
	- Sort by length (shortest first)

	- Remove all tweets where isMultiLine = true
	- b1 is fine. No need for any logic.
	- Do an initial loop for isMultiLine

		For loop x = 2, x = length x++
			if (botData.aPhrases[x].isMultiLine) {
				Grab index 0 b Phrase
			} else {
				""
			}
	- Do another loop for isMultiLine = false

		for loop y = 2, y = length y++
			if (botData.aPhrases[x].isMultiLine == false) {
				Grab random B phrase
			}
		}















