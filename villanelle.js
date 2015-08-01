var _             = require('lodash');
var Client        = require('node-rest-client').Client;
var Twit          = require('twit');
var async         = require('async');
var wordfilter    = require('wordfilter');
var request       = require('request');
var emojiRegex 	  = require('emoji-regex');

// var t = new Twit({
//     consumer_key: 			process.env.VILLANELLE_TWIT_CONSUMER_KEY,
//     consumer_secret: 		process.env.VILLANELLE_TWIT_CONSUMER_SECRET,
//     access_token: 			process.env.VILLANELLE_TWIT_ACCESS_TOKEN,
//     access_token_secret: 	process.env.VILLANELLE_TWIT_ACCESS_TOKEN_SECRET
// });

var t = new Twit({
    consumer_key: 			process.env.VILLANELLE_TWIT_CONSUMER_KEY,
    consumer_secret: 		process.env.VILLANELLE_TWIT_CONSUMER_SECRET,
    app_only_auth: 			true
    // access_token: 			process.env.VILLANELLE_TWIT_ACCESS_TOKEN,
    // access_token_secret: 	process.env.VILLANELLE_TWIT_ACCESS_TOKEN_SECRET
});
   

var wordnikKey = 			process.env.VILLANELLE_WORDNIK_KEY;


getRandomWords = function(cb) {
	console.log("========= Get Random Words =========");	
	var botData = {
		allWords: [],
		rhymingWordsData: [],
		rhymingWordsArray: [],
		aWords: [],
		bWords: [],
		aTweetsFull: [],
		bTweetsFull: [],
		aPhrases: [],
		bPhrases: [],
		aPhrasesQuotaMet: false,
		bPhrasesQuotaMet: false
		// allPosts: [],
		// allParsedTweets: [],
		// allPostsWordList: [],
		// wordList: [],
		// nounList: [],
		// titleMatchArray: []
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

	var rhymingWordsArray = [];
	
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
					&& (currentWord.length <= 11)) {
					rhymingWordsArray[j].push(currentArrayPos[0].words[k]);
				}			
			}
		}
	}

	// Cycle through array, remove anything with less than 10 rhyming words.
	for (x = rhymingWordsArray.length - 1; x >= 0; x--) {
		if (rhymingWordsArray[x].length < 15) {
			rhymingWordsArray.splice(x, 1);
		}
	}

	botData.rhymingWordsArray = rhymingWordsArray.sort(function(a, b) {
		return b.length - a.length;
	});

	cb(null, botData);
}


setRhymeSchemes = function(botData, cb) {
	console.log("========= Set Rhyme Schemes =========");	

	if (botData.rhymingWordsArray.length >= 2) {
		botData.aWords = botData.rhymingWordsArray[0];
		botData.bWords = botData.rhymingWordsArray[1];

		botData.rhymingWordsArray.splice(0, 2);
		cb(null, botData);
	} else {
		cb("We've run out of rhyming words to search for. This ends now.");
	}
};


getAllPublicTweets = function(botData, cb) {
	console.log("========= Get All Public Tweets =========");

	getAllTweetsSequence = function(wordsArray, rhyme) {
	    async.mapSeries(wordsArray, getTweetsByWord, function(err, results){
	    	if (err) {
	    		cb("Problem getting Tweets. Sequence failed.");
	    	} else {
	    		if (rhyme == "a") {
	    			console.log("A tweets completed.");
	    			botData.aTweetsFull = results;
					getAllTweetsSequence(botData.bWords, "b");
	    		} else {
	    			console.log("B tweets completed.");
	    			botData.bTweetsFull = results;
	    			cb(null, botData);
	    		}    		
	    	}	
	    }); 
	}

	getAllTweetsSequence(botData.aWords, "a");
}



getTweetsByWord = function(word, cb) {
    t.get('search/tweets', {q: word, count: 100, result_type: 'recent', lang: 'en'}, function(err, data, response) {
		if (!err) {
			
			var twitterResults = [];

			// Loop through all returned statues
			for (var i = 0; i < data.statuses.length; i++) {

				var tweet = data.statuses[i].text.toLowerCase(),
					hasReply = tweet.indexOf('@'), 
					hasHashtag = tweet.indexOf('#')
					hasLink = tweet.indexOf('http');
					hasAmp = tweet.indexOf('&');

				// Does the tweet contain offensive words?
				if (!wordfilter.blacklisted(tweet)) {
					// Does the tweet contain an emoji?
					if (emojiRegex().test(tweet) == false) {
						// Does the tweet have a reply, hashtag, or URL?
						if ((hasReply == -1) && (hasHashtag == -1) && (hasLink == -1) && (hasAmp == -1)) {
							
							// Checking if word is at the end of a sentence.
							var regex = new RegExp(word + "[?!.]+$");
							if (regex.test(tweet)) {
								// Keep under 50 characters in length;
								if (tweet.length <= 50) {
									twitterResults.push(data.statuses[i].text);
								}
							}				
						}
					}
				}
			}
			cb(null, twitterResults);
		} else {
			console.log(err);
			cb("There was an error getting a public Tweet.");
		}
    });
};


theNextThing = function(botData, cb) {
	// Clean up and transfer workable A phrases
	for (var i = 0; i < botData.aTweetsFull.length; i++) {
	    if (botData.aTweetsFull[i].length > 0) {
	        for (var j = 0; j < botData.aTweetsFull[i].length; j++) {
				botData.aPhrases.push(botData.aTweetsFull[i][j]); 
	        }
	    }
	}	

	// Clean up and transfer workable B phrases
	for (var x = 0; x < botData.aTweetsFull.length; x++) {
	    if (botData.aTweetsFull[x].length > 0) {
	        for (var y = 0; y < botData.aTweetsFull[x].length; y++) {
				botData.aPhrases.push(botData.aTweetsFull[x][y]); 
	        }
	    }
	}

	console.log('---------------------------');
	console.log(botData.aPhrases);
	console.log('---------------------------');
	console.log(botData.bPhrases);
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
    	setRhymeSchemes,
		getAllPublicTweets,
		theNextThing 
		// extractWordsFromTweet,
		// getAllWordData, 
		// findNouns,
		// getAllFlickrIDs,
		// flickrIDClean,
		// getAllFlickrSizes,
		// formatTweet
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

