var _             = require('lodash');
var Client        = require('node-rest-client').Client;
var Twit          = require('twit');
var async         = require('async');
var wordfilter    = require('wordfilter');
var request       = require('request');
var levenshtein 	= require('fast-levenshtein');
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
		aWords: [],
		bWords: [],
		aTweetsFull: [],
		bTweetsFull: [],
		aPhrases: [],
		bPhrases: [],
		levenshteinThreshold: 5,
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
		maxArrays = 22,
		desiredNumberOfRhymes = 20;
	
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

		// console.log(JSON.stringify(rhymingWordsArray[x]));
		// console.log(" =========================== ");
	}

	// Avoid hitting rate limit in a single call. Must be lower than 450 (22 arrays with 20 items each)
	
maxArrays = 3;	// TESTING ONLY - REMOVE THIS!

	if (rhymingWordsArray.length > maxArrays) {
		_.shuffle(rhymingWordsArray);
		rhymingWordsArray = rhymingWordsArray.slice(0, maxArrays);
	}

	botData.rhymingWordsArray = rhymingWordsArray;

	cb(null, botData);
}


// setRhymeSchemes = function(botData, cb) {
// 	console.log("========= Set Rhyme Schemes =========");	

// 		Skip this part completely. Take all of botData.rhymingWordsArray and send that all to Twitter,
// 		and do a massive search for all of those rhyming words.

// 		Add a botData.counter and use that to trigger getAllTweetsSequence until completed.
// 		Add tweets that pass the criteria to a new array "rhymeSchemeArray"
// 		Example:
// 		botData.rhymeSchemeArray = [
// 				[
// 					"Do not go gentle into that good night,",
// 					"Rage, rage against the dying of the light.",
// 					"Though wise men at their end know dark is right,"
// 				],
// 				[
// 					"Old age should burn and rave at close of day;",
// 					"Because their words had forked no lightning they"
// 				]
// 			]

// 		When completed, do an inventory. Loop through rhymeSchemeArray and determine if we have enough 
// 		items for the poem. Need one set of 7, one set of 6.

// 		Are the below still necessary?
// 			aWords
// 			bWords
// 			aTweetsFull
// 			bTweetsFull
// 			aPhrases
// 			bPhrases
// 			aPhrasesQuotaMet
// 			bPhrasesQuotaMet



getAllPublicTweets = function(botData, cb) {
	console.log("========= Get All Public Tweets =========");
	botData.counter = 0;

	getAllTweetsSequence = function(pos) {
	    async.mapSeries(botData.rhymingWordsArray[pos], getTweetsByWord, function(err, results){
	    	if (err) {
	    		cb("Problem getting Tweets. Sequence failed.");
	    	} else {
	    		console.log("   " + (botData.counter + 1) + " set of Twitter posts found.");

	    		botData.rhymeSchemeArray.push(results);
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


gatherAndCleanPhrases = function(botData, cb) {
	// We are working with data within botData.rhymeSchemeArray
	// Cleaning up, and storing in botData.finalRhymeSchemeArray

	// Clean up and transfer workable A phrases
	for (var i = 0; i < botData.rhymeSchemeArray.length; i++) {
	    if (botData.rhymeSchemeArray[i].length > 0) {
	        for (var j = 0; j < botData.rhymeSchemeArray[i].length; j++) {

	        	// for (var k = 0; k < botData.rhymeSchemeArray[i][j].length; k++) {
	        	for (var k = botData.rhymeSchemeArray[i][j].length - 1; k >= 0; k-- ) {
	        		
	        		console.log(botData.rhymeSchemeArray[i][j][k]);

	        		if (/[0-9]+/.test(botData.rhymeSchemeArray[i][j][k][0])) {
	        			botData.rhymeSchemeArray[i][j].splice(k, 1);
	        		}

	        		/* 
	        			Do some checks here - 
	        			1) Check to see if last word is repeated. 
	        				Example sentence 1: ... who can deny.
	        				Example sentence 2: ... you should deny!
						2) Check to ensure first character is a number. Rewrite above check?
					*/
	        			
	    //     		} else {
					// var phrase = botData.rhymeSchemeArray[i][j][k][0].toUpperCase() + botData.rhymeSchemeArray[i][j][k].substr(1);
					// console.log(phrase);	
					// botData.rhymeSchemeArray[i][j][k] = phrase;
	    //     		};


		        	// Make sure it doesn't start with a number,
		    //     	if (/[0-9]+/.test(botData.rhymeSchemeArray[i][j][k][0]) == false) {
						// var phrase = botData.rhymeSchemeArray[i][j][k][0].toUpperCase() + botData.rhymeSchemeArray[i][j][k].substr(1);
						// botData.finalRhymeSchemeArray.push(phrase);

		     //    		if (botData.finalRhymeSchemeArray.length > 0) {
		     //    			var isOriginal = true;
		     //    			for (var l = 0; l < botData.finalRhymeSchemeArray.length; l++) {
		     //    				var distance = levenshtein.get(phrase.toLowerCase(), botData.finalRhymeSchemeArray[l].toLowerCase());
		     //    				if (distance < botData.levenshteinThreshold) {
		     //    					botData.finalRhymeSchemeArray.push(phrase);
		     //    				}
		     //    			}
		     //    		} else {
							// botData.finalRhymeSchemeArray.push(phrase);
		     //    		}
		        	// }
		        }
	        }
	    }
	}	

	console.log('===========================');
	console.log(JSON.stringify(botData.finalRhymeSchemeArray));

	// botData.aPhrases = _.unique(botData.aPhrases);

	// cb(null, botData);
}

checkRequirements = function(botData, cb) {
	if (botData.aPhrases.length >= 7) {
		botData.aPhrasesQuotaMet = true;
	}

	if (botData.bPhrases.length >= 6) {
		botData.bPhrasesQuotaMet = true;
	}

	if ((botData.aPhrasesQuotaMet) && (botData.bPhrasesQuotaMet)) {
		cb(null, botData);
	} else {
		console.log("Not enough A/B phrases");
		botData.aPhrasesQuotaMet = false;
		botData.bPhrasesQuotaMet = false;
		
		// setRhymeSchemes(botData, cb);
		cb("Not enough A/B phrases");
	}
}

formatPoem = function(botData, cb) {
	console.log('---------------------------');

	console.log(botData.aPhrases);
	console.log(botData.bPhrases);

	var A1, A2, 
		a1, a2, a3, a4, a5,
		b1, b2, b3, b4, b5, b6;
	
	A1 = botData.aPhrases[0];
	A2 = botData.aPhrases[1];
	a1 = botData.aPhrases[2];
	a2 = botData.aPhrases[3];
	a3 = botData.aPhrases[4];
	a4 = botData.aPhrases[5];
	a5 = botData.aPhrases[6];

	b1 = botData.bPhrases[0];
	b2 = botData.bPhrases[1];
	b3 = botData.bPhrases[2];
	b4 = botData.bPhrases[3];
	b5 = botData.bPhrases[4];
	b6 = botData.bPhrases[5];

	var villanelle = [A1, b1, A2, null, a1, b2, A1, null, a2, b3, A2, null, a3, b4, A1, null, a4, b5, A2, null, a5, b6, A1, A2];

	for (var i = 0; i < villanelle.length; i++) {
		if (villanelle[i] !== null) {
			console.log(villanelle[i]);
		} else {
			console.log('\n');
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
    	// setRhymeSchemes,
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

