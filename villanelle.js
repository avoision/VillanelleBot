var _             = require('lodash');
var Client        = require('node-rest-client').Client;
var Twit          = require('twit');
var async         = require('async');
var wordfilter    = require('wordfilter');
var request       = require('request');
var emojiRegex 	  = require('emoji-regex');

var t = new Twit({
    consumer_key: 			process.env.VILLANELLE_TWIT_CONSUMER_KEY,
    consumer_secret: 		process.env.VILLANELLE_TWIT_CONSUMER_SECRET,
    app_only_auth: 			true
});

var wordnikKey = 			process.env.VILLANELLE_WORDNIK_KEY;

getRandomWords = function(cb) {
	console.log("========= Get Random Words =========");	
	var botData = {
		counter: 0,
		allWords: [],
		rhymingWordsData: [],
		rhymingWordsArray: [],
		rhymeSchemeArray: [],
		finalRhymeSchemeArray: [],
		aPhrases: [],
		bPhrases: [],
		aPhrasesQuotaMet: false,
		bPhrasesQuotaMet: false
	};

    var client = new Client();
    var partsOfSpeech = ["noun", "adjective", "verb"],
    	randomPos = Math.floor(Math.random() * partsOfSpeech.length),
    	randomPartOfSpeech = partsOfSpeech[randomPos];

    var wordnikRandomOptions = {
    	hasDictionaryDef: "true",
		includePartOfSpeech: randomPartOfSpeech,
		minCorpusCount: "10000",
		maxCorpusCount: "-1",
		minDictionaryCount: "5",
		maxDictionaryCount: "-1",
		minLength: "3",
		maxLength: "7",
		limit: "50",
		api_key: wordnikKey
    };

    // If verb, require fewer definitions
    if (randomPartOfSpeech == "verb") {
    	wordnikRandomOptions.minDictionaryCount = 2;
    };

    var wordnikGetRandomWordsURL = 
		"http://api.wordnik.com:80/v4/words.json/randomWords" 
		+ "?hasDictionaryDef=" + wordnikRandomOptions.hasDictionaryDef
		+ "&includePartOfSpeech=" + wordnikRandomOptions.includePartOfSpeech
		+ "&minCorpusCount=" + wordnikRandomOptions.minCorpusCount
		+ "&maxCorpusCount=" + wordnikRandomOptions.maxCorpusCount
		+ "&minDictionaryCount=" + wordnikRandomOptions.minDictionaryCount
		+ "&maxDictionaryCount=" + wordnikRandomOptions.maxDictionaryCount
		+ "&minLength=" + wordnikRandomOptions.minLength
		+ "&maxLength=" + wordnikRandomOptions.maxLength
		+ "&limit=" + wordnikRandomOptions.limit
		+ "&api_key=" + wordnikRandomOptions.api_key;


    var args = {
		headers: {'Accept':'application/json'}
    };

    client.get(wordnikGetRandomWordsURL, args, function (data, response) {
		if (response.statusCode === 200) {
			var result = JSON.parse(data);
			cb(null, botData, result);
		} else {
			cb(null, null);
		}
    });
};

cleanRandomWords = function(botData, result, cb) {
	console.log("========= Clean Random Words =========");	
	for (var i = result.length - 1; i >= 0; i--) {
		// If word begins with a capital letter, or contains an apostrophe: remove.
		if ((result[i].word.charAt(0) == result[i].word.charAt(0).toUpperCase()) 
			|| (/'/.test(result[i].word))) {
			result.splice(i, 1);
		} else {
			botData.allWords.push(result[i].word);
		};
	};
	cb(null, botData);
};


getAllRhymes = function(botData, cb) {
	console.log("========= Get All Rhymes =========");	

	getRhymesSequence = function() {
	    async.mapSeries(botData.allWords, findRhymes, function(err, results){
	    	if (err) {
	    		cb("Problem getting rhyming words");
	    	} else {
	    		botData.rhymingWordsData = results;
	    		cb(null, botData);
	    	}	
	    }); 
	}
	getRhymesSequence();
}


findRhymes = function(word, cb) {
	// console.log("========= Find Rhymes: " + word + " =========");	

	var wordnikRhymeOptions = {
			useCanonical: "false",
			relationshipTypes: "rhyme",
			limitPerRelationshipType: "100",
			api_key: wordnikKey
		};

	var client = new Client();

	var wordnikURL = 
		"http://api.wordnik.com:80/v4/word.json/"
		+ word + "/relatedWords"
		+ "?useCanonical=" + wordnikRhymeOptions.useCanonical
		+ "&relationshipTypes=" + wordnikRhymeOptions.relationshipTypes
		+ "&limitPerRelationshipType=" + wordnikRhymeOptions.limitPerRelationshipType
		+ "&api_key=" + wordnikKey;

	var args = {
		headers: {'Accept':'application/json'}
	};
	
    client.get(wordnikURL, args, function (data, response) {
		if (response.statusCode === 200) {
			var result = JSON.parse(data);
			
			if (result.length) {
				cb(null, result);
			} else {
				cb(null, null);
			}
			return;
		} else {
			cb(null, null);
		}
    });
};


createRhymeLists = function(botData, cb) {
	console.log("========= Create Rhyme Lists =========");	

	var rhymingWordsArray = [],
		minWordLength = 3,
		maxWordLength = 7,
		maxArrays = 16,
		desiredNumberOfRhymes = 30;
	
	for (var i = 0; i < botData.allWords.length; i++) {
		rhymingWordsArray[i] = [];
		rhymingWordsArray[i].push(botData.allWords[i]);
	}

	for (var j = 0; j < botData.rhymingWordsData.length; j++) {
		var currentArrayPos = botData.rhymingWordsData[j];
		if (currentArrayPos != null) {
			// Cycle through rhyming words. 
			for (var k = 0; k < currentArrayPos[0].words.length; k++) {
				var currentWord = currentArrayPos[0].words[k];
				// Ensure first letter is not capitalized.
				// Also: remove based on length? Anything greater than 11 characters?
				if (currentWord.charAt(0) !== currentWord.charAt(0).toUpperCase()
					&& (currentWord.length >= minWordLength)
					&& (currentWord.length <= maxWordLength)) {
					rhymingWordsArray[j].push(currentArrayPos[0].words[k]);
				}			
			}
		}
	}

	// Cycle through array, remove anything with less than desired number of rhymes.
	for (var x = rhymingWordsArray.length - 1; x >= 0; x--) {
		if (rhymingWordsArray[x].length < desiredNumberOfRhymes) {
			rhymingWordsArray.splice(x, 1);
			continue;
		};

		// If more than desired number of rhymes, randomize and trim
		if (rhymingWordsArray[x].length > desiredNumberOfRhymes) {
			_.shuffle(rhymingWordsArray[x]);
			rhymingWordsArray[x] = rhymingWordsArray[x].slice(0, desiredNumberOfRhymes);
		}
	}

	// Avoid hitting rate limit in a single call. Must be lower than 450 (22 arrays with 20 items each)
	
maxArrays = 5;	// TESTING ONLY - REMOVE THIS!

	if (rhymingWordsArray.length > maxArrays) {
		_.shuffle(rhymingWordsArray);
		rhymingWordsArray = rhymingWordsArray.slice(0, maxArrays);
	}

	botData.rhymingWordsArray = rhymingWordsArray;

	cb(null, botData);
}


getAllPublicTweets = function(botData, cb) {
	console.log("========= Get All Public Tweets =========");
	botData.counter = 0;

	getAllTweetsSequence = function(pos) {
	    async.mapSeries(botData.rhymingWordsArray[pos], getTweetsByWord, function(err, results){
	    	if (err) {
	    		cb("Problem getting Tweets. Sequence failed.");
	    	} else {
	    		console.log("   " + (botData.counter + 1) + " set of Twitter posts found.");

	    		if (results != null) {
					botData.rhymeSchemeArray.push(results);
	    		}

	    		botData.counter++;

	    		if (botData.counter == botData.rhymingWordsArray.length) {
	    			cb(null, botData);
	    		} else {
	    			getAllTweetsSequence(botData.counter);
	    		}		
	    	}	
	    }); 
	}

	getAllTweetsSequence(botData.counter);
}



getTweetsByWord = function(word, cb) {
    t.get('search/tweets', {q: word, count: 100, result_type: 'recent', lang: 'en'}, function(err, data, response) {
		if (!err) {
			
			var twitterResults = [];

			// Loop through all returned statues
			for (var i = 0; i < data.statuses.length; i++) {
				var currentTweet = data.statuses[i].text.toLowerCase(),
					hasReply = currentTweet.indexOf('@'), 
					hasHashtag = currentTweet.indexOf('#')
					hasLink = currentTweet.indexOf('http');
					hasAmp = currentTweet.indexOf('&');

				var currentTweetID = data.statuses[i].id_str,
					currentUserID = data.statuses[i].user.id_str,
					currentUserScreenName = data.statuses[i].user.screen_name;


				// Does the current tweet contain offensive words?
				if (!wordfilter.blacklisted(currentTweet)) {
					// Does the tweet contain an emoji?
					if (emojiRegex().test(currentTweet) == false) {
						// Does the current tweet have a reply, hashtag, or URL?
						if ((hasReply == -1) && (hasHashtag == -1) && (hasLink == -1) && (hasAmp == -1)) {
							// Checking if word is at the end of a sentence.
							var regex = new RegExp(word + "[ ,?!.]+$");
							if (regex.test(currentTweet)) {
								// Keep under 50 characters in length;
								if (currentTweet.length <= 55) {
									var tweetData = {
										tweet: data.statuses[i].text,
										tweetID: currentTweetID,
										userID: currentUserID,
										userScreenName: currentUserScreenName,
										url: "http://twitter.com/" + currentUserScreenName + "/status/" + currentTweetID
									};

									twitterResults.push(tweetData);
								}
							}				
						}
					}
				}
			}

			// Do we have more than one example with this word? 
			// If so, randomize and reduce to one.
			if (twitterResults.length > 1) {
				_.shuffle(twitterResults);
			}

			twitterResults = twitterResults.slice(0, 1);

			console.log("+++++++++");
			cb(null, twitterResults);
		} else {
			console.log(err);
			cb("There was an error getting a public Tweet.");
		}
    });
};


gatherAndCleanPhrases = function(botData, cb) {
	var rhymesData = botData.rhymeSchemeArray;

	console.log(JSON.stringify(rhymesData));

	// We have a lot of empty arrays in botData.rhymeSchemeArray. Remove empties.
	for (var i = rhymesData.length - 1; i >= 0; i--) {
	    if (rhymesData[i].length > 0) {
	        for (var j = rhymesData[i].length - 1; j >= 0; j--) {
	        	if (rhymesData[i][j].length > 0) {	
		        	for (var k = rhymesData[i][j].length - 1; k >= 0; k-- ) {
		        		// Starts with a number? If so, remove it.
		        		if (/[0-9]+/.test(rhymesData[i][j][k].tweet.charAt(0))) {
							rhymesData[i][j].splice(k, 1);
		        		}
			        }
			    } else {
			    	// Empty. Remove.
			    	rhymesData[i].splice(j, 1);
			    }
	        }
	    }
	};

	botData.rhymeSchemeArray = rhymesData;
	cb(null, botData);
}

checkRequirements = function(botData, cb) {

	var rhymeSets = botData.rhymeSchemeArray,
		totalRhymeSets = rhymeSets.length;

	if (totalRhymeSets >= 2) {

		// Locate "A Phrases." We need 7.
		for (var i = 0; i < rhymeSets.length; i++) {
			if (rhymeSets[i].length >= 7) {
				botData.aPhrases = rhymeSets[i];
				_.shuffle(botData.aPhrases);
				botData.aPhrases = botData.aPhrases.slice(0, 7);

				for (var a = 0; a <botData.aPhrases.length; a++) {
					botData.aPhrases[a] = botData.aPhrases[a][0];
				}

				botData.aPhrasesQuotaMet = true;
				rhymeSets.splice(i, 1);
				break;
			}
		}

		// Local "B Phrases." We need 6.
		if (botData.aPhrasesQuotaMet) {
			for (var j = 0; j < rhymeSets.length; j++) {
				if (rhymeSets[j].length >= 6) {
					botData.bPhrases = rhymeSets[j];
					_.shuffle(botData.bPhrases);
					botData.bPhrases = botData.bPhrases.slice(0, 6);

					for (var b = 0; b <botData.bPhrases.length; b++) {
						botData.bPhrases[b] = botData.bPhrases[b][0];
					}

					botData.bPhrasesQuotaMet = true;
					break;
				}
			}

			if (botData.bPhrasesQuotaMet) {
				cb(null, botData);
			} else {
				cb("We got the As but not the Bs. Swing and a miss.");
			}
		} else {
			cb("Not enough A rhymes. Sadness.");
		}
	} else {
		cb("Less than two rhyme sets. Cannot write a poem.");
	};
}

formatPoem = function(botData, cb) {
	console.log('---------------------------');

	console.log("A Phrases: " + JSON.stringify(botData.aPhrases));
	console.log("B Phrases: " + JSON.stringify(botData.bPhrases));

	var A1, A2, 
		a1, a2, a3, a4, a5,
		b1, b2, b3, b4, b5, b6;
	
	A1 = botData.aPhrases[0].tweet;
	A2 = botData.aPhrases[1].tweet;
	a1 = botData.aPhrases[2].tweet;
	a2 = botData.aPhrases[3].tweet;
	a3 = botData.aPhrases[4].tweet;
	a4 = botData.aPhrases[5].tweet;
	a5 = botData.aPhrases[6].tweet;

	b1 = botData.bPhrases[0].tweet;
	b2 = botData.bPhrases[1].tweet;
	b3 = botData.bPhrases[2].tweet;
	b4 = botData.bPhrases[3].tweet;
	b5 = botData.bPhrases[4].tweet;
	b6 = botData.bPhrases[5].tweet;

	var villanelle = [A1, b1, A2, null, a1, b2, A1, null, a2, b3, A2, null, a3, b4, A1, null, a4, b5, A2, null, a5, b6, A1, A2];

	console.log('---------------------------');
	for (var i = 0; i < villanelle.length; i++) {
		if (villanelle[i] !== null) {
			console.log(villanelle[i]);
		} else {
			console.log('');
		}
	}
	console.log('---------------------------');
}


// ===========================
// Execute
// ===========================
run = function() {
	console.log("========= Starting! =========");

    async.waterfall([
    	getRandomWords,
    	cleanRandomWords,
    	getAllRhymes,
    	createRhymeLists,
		getAllPublicTweets,
		gatherAndCleanPhrases,
		checkRequirements,
		formatPoem
    ],
    function(err, botData) {
		if (err) {
			console.log('Error: ', err);
		}
    });
}

// ===========================
// Cleanup
// ===========================
// iReallyReallyWantToDeleteAllTweets = function() {
// 	t.get('statuses/user_timeline', {screen_name: 'thedesirebot', count: 10}, function(err, data, response) {
// 		if (!err) {
// 			var liveTweetsArray = [];
			
// 			for (i = 0; i < data.length; i++) {
// 				liveTweetsArray.push(data[i].id_str);
// 			}

// 			for (j = 0; j < liveTweetsArray.length; j++) {
// 				t.post('statuses/destroy/' + liveTweetsArray[j], {id: liveTweetsArray[j]}, function(err, data, response) {
// 					if (!err) {
// 						console.log("Deleted!");
// 					}
// 				});
// 			}
// 		}
// 	})
// }

// setInterval(function() {
//   try {
//     run();
//   }
//   catch (e) {
//     console.log(e);
//   }
// }, 60000 * 30);

run();

