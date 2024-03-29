var _             = require('underscore');
var Client        = require('node-rest-client').Client;
var Twit          = require('twit');
var async         = require('async');
var wordfilter    = require('wordfilter');
var request       = require('request');
var emojiRegex 	  = require('emoji-regex');
var tumblr 		  = require('tumblr.js');
var rita 		  = require('rita');
var levenshtein   = require('fast-levenshtein');

var t = new Twit({
    consumer_key: 			process.env.VILLANELLE_TWIT_CONSUMER_KEY,
    consumer_secret: 		process.env.VILLANELLE_TWIT_CONSUMER_SECRET,
    app_only_auth: 			true
});

var tf = new Twit({
    consumer_key: 			process.env.VILLANELLE_TWIT_CONSUMER_KEY,
    consumer_secret: 		process.env.VILLANELLE_TWIT_CONSUMER_SECRET,
    access_token: 			process.env.VILLANELLE_TWIT_ACCESS_TOKEN,
    access_token_secret: 	process.env.VILLANELLE_TWIT_ACCESS_TOKEN_SECRET
});


var tumblrClient = tumblr.createClient({
  consumer_key: 			process.env.VILLANELLE_TUMBLR_CONSUMER_KEY,
  consumer_secret: 			process.env.VILLANELLE_TUMBLR_CONSUMER_SECRET,
  token: 					process.env.VILLANELLE_TUMBLR_ACCESS_TOKEN,
  token_secret: 			process.env.VILLANELLE_TUMBLR_ACCESS_TOKEN_SECRET
});

var wordnikKey = 			process.env.VILLANELLE_WORDNIK_KEY;

// RiTa.js
var lexicon = new rita.RiLexicon();

// Levenshtein distance, to avoid similar strings.
var levenshteinThreshold = 10;

// Bad words
wordfilter.addWords(['nigga', 'niggas', 'nigg', 'pussies', 'gay']);

// Custom characters
wordfilter.addWords(['@','#', 'http', 'www']);

// Junk shorthand from lazy typers
wordfilter.addWords([' ur ', ' u ']);

// Lyrics and annoyingly frequent rhyme words to ignore
var annoyingRhymeRepeaters = ['grenade', 'dorr', 'hand-granade', 'noncore', 'arcade', 'doe', 'fomented', 'ion', 'mane', 'mayne', 'dase', 'belied', 'rase', 'dase', 'mane', 'mayne', 'guise', 'demur', 'deter', 'boo', 'ores', 'ore', 'gait', 'shoals', 'pries', 'moat', 'rye', 'blurt', 'flue', 'cleat', 'skeet'];

// Possible additions: ion
// So many terrible mistakes, due to auto-correct and laziness. I weep for our future.

// Tracking the rejects
var statsTracker = {
	total: 0,
	accepted: 0,
	hasMultiline: 0,
	rejectTracker: {
		blacklist: 0,
		emoji: 0,
		hasNumber: 0,
		length: 0,
		notNearEnd: 0,
		excessivePunctuation: 0,
		noPunctuationAtEnd: 0,
		punctuationMisMatchAtEnd: 0,
		repetition: 0,
		paradiseFound: 0,
		selfReference: 0,
		slang: 0,
		upper: 0
	}
};

getRandomWords = function(cb) {
	console.log("========= Get Random Words =========");
	var botData = {
		counter: 0,
		wordCounter: 0,
		maxWordCounter: 70,
		allWords: [],
		rhymingWordsData: [],
		rhymingWordsArray: [],
		rhymeSchemeArray: [],
		finalRhymeSchemeArray: [],
		aPhrases: [],
		bPhrases: [],
		aPhrasesQuotaMet: false,
		bPhrasesQuotaMet: false,
		tumblrPostID: 0,
		tumblrPostTitle: ''
	};

    var client = new Client();
    var partsOfSpeech = ["noun", "adjective", "verb"],
    	randomPos = Math.floor(Math.random() * partsOfSpeech.length),
    	randomPartOfSpeech = partsOfSpeech[randomPos];

    var wordnikRandomOptions = {
    	hasDictionaryDef: "true",
		includePartOfSpeech: randomPartOfSpeech,
		minCorpusCount: "30000",
		maxCorpusCount: "-1",
		minDictionaryCount: "3",
		maxDictionaryCount: "-1",
		minLength: "3",
		maxLength: "7",
		limit: "75",
		api_key: wordnikKey
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

	botData.allWords = _.shuffle(botData.allWords);

	// Reduce number of similarly rhyming words from the set. Compare array elements to one another
	// and toss out matches based on last four characters.
	for (var a = 0; a < botData.allWords.length-1; a++) { // No need to select last item to compare.
	    firstSuffix = botData.allWords[a].substr(botData.allWords[a].length - 4);

	    for (var b = botData.allWords.length - 1; b >= a+1; b--) { // No need to check word against itself.
	        checkSuffix = botData.allWords[b].substr(botData.allWords[b].length - 4);
	        if (firstSuffix == checkSuffix) {
	            // Matching words, high chance for rhyme overlap. Remove.
	            console.log("Discarded: " + botData.allWords[a] + " / " + botData.allWords[b]);
	            botData.allWords.splice(b, 1);
	        }
	    }
	}

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
	var wordnikRhymeOptions = {
			useCanonical: "false",
			relationshipTypes: "rhyme",
			limitPerRelationshipType: "120",
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
		maxWordLength = 6,
		maxArrays = 10,						// Keep rate limit in mind
		minArrays = 2,						// maxArrays * maxDesiredNumberOfRhymes = total possible calls
		minDesiredNumberOfRhymes = 10,		// Must be lower than 450
		maxDesiredNumberOfRhymes = 50;

	for (var i = 0; i < botData.allWords.length; i++) {
		rhymingWordsArray[i] = [];
		rhymingWordsArray[i].push(botData.allWords[i]);
	}

	for (var j = 0; j < botData.rhymingWordsData.length; j++) {
		var currentArrayPos = botData.rhymingWordsData[j];
		if (currentArrayPos != null) {
			// Cycle through rhyming words.

			for (var k = 0; k < currentArrayPos[0].words.length; k++) {
				var isAnnoyingRhymeRepeater = false;
				var currentWord = currentArrayPos[0].words[k];

				for (var m = 0; m < annoyingRhymeRepeaters.length; m++) {
					if (currentWord == annoyingRhymeRepeaters[m]) {
						isAnnoyingRhymeRepeater = true;
						console.log("Eww: " + currentWord);
						break;
					}
				}

				// Ensure first letter is not capitalized.
				// Also: remove based on length? Anything greater than 11 characters?
				if (currentWord.charAt(0) !== currentWord.charAt(0).toUpperCase()
					&& (isAnnoyingRhymeRepeater == false)
					&& (currentWord.length >= minWordLength)
					&& (currentWord.length <= maxWordLength)) {
					rhymingWordsArray[j].push(currentArrayPos[0].words[k]);
				}
			}
		}
	}

	// Cycle through array, remove anything with less than desired number of rhymes.
	for (var x = rhymingWordsArray.length - 1; x >= 0; x--) {

		if (rhymingWordsArray[x].length < minDesiredNumberOfRhymes) {
			rhymingWordsArray.splice(x, 1);
			continue;
		};

		// If more than desired number of rhymes, randomize and trim
		if (rhymingWordsArray[x].length > maxDesiredNumberOfRhymes) {
			// Keep track of the first word
			var firstWord = rhymingWordsArray[x][0];
			rhymingWordsArray[x] = _.shuffle(rhymingWordsArray[x]);
			rhymingWordsArray[x].unshift(firstWord);
			rhymingWordsArray[x] = rhymingWordsArray[x].slice(0, maxDesiredNumberOfRhymes);
		}
	}

	if (rhymingWordsArray.length > maxArrays) {
		rhymingWordsArray = _.shuffle(rhymingWordsArray);
		rhymingWordsArray = rhymingWordsArray.slice(0, maxArrays);
	}

	if (rhymingWordsArray.length < minArrays) {
		cb("Not enough rhyming words.");
		return;
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
	    		console.log('--------- End Round ' + (botData.counter + 1) + '---------');
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
	var suffix = "%20-RT%20-%40%20-http";

	console.log('--------- ' + word + ' ---------');

    t.get('search/tweets', {q: word + suffix, count: 100, result_type: 'recent', lang: 'en', include_entities: 'false'}, function(err, data, response) {
		if (!err) {

			var twitterResults = [];

			// Loop through all returned statues
			for (var i = 0; i < data.statuses.length; i++) {
				statsTracker.total++;

				// Is it one of the Paradise Lost bots? Milton!!!
				var username = data.statuses[i].user.screen_name;
				if (/milton_book/.test(username)) {
					statsTracker.rejectTracker.paradiseFound++;
					continue;
				};

				// Don't quote yourself. It's gauche.
				if (/VillanelleBot/.test(username)) {
					statsTracker.rejectTracker.selfReference++;
					continue;
				}

				data.statuses[i].text = data.statuses[i].text.trim();

				// Alteration: Adding period at the end of tweets.
				// I hate to mess with the original tweet. But we do this for Art!
				if (/[a-z]$/.test(data.statuses[i].text)) {
					data.statuses[i].text += ".";
				}

				var lowSelfEsteem = / i /g;
				data.statuses[i].text = data.statuses[i].text.replace(lowSelfEsteem, ' I ');

				var tweetOriginal = data.statuses[i].text;

				// Remove tweets with excessive uppercase
				if (/[A-Z]{2}/.test(tweetOriginal)) {
					statsTracker.rejectTracker.upper++;
					continue;
				};

				var tweetLowerCase = tweetOriginal.toLowerCase();

				var currentTweetID = data.statuses[i].id_str,
					currentUserID = data.statuses[i].user.id_str,
					currentUserScreenName = data.statuses[i].user.screen_name;

				// Does the current tweet contain a number or weird characters?
				if (/[0-9#\/]+/.test(tweetLowerCase)) {
					statsTracker.rejectTracker.hasNumber++;
					continue;
				}

				// Does the current tweet contain offensive words?
				if (wordfilter.blacklisted(tweetLowerCase)) {
					statsTracker.rejectTracker.blacklist++;
					continue;
				}

				// Does the tweet contain an emoji?
				if (emojiRegex().test(tweetLowerCase)) {
					statsTracker.rejectTracker.emoji++;
					continue;
				}

				// Do we have ellipses or ?! or other excessive punctuation? Reject.
				if (/[,?!.]{2}/.test(tweetLowerCase)) {
					statsTracker.rejectTracker.excessivePunctuation++;
					continue;
				}

				// Repeat offenders.
				if (
					(tweetLowerCase.indexOf('men cry and defy') > -1) ||
				   	(tweetLowerCase.indexOf('episode of teen wolf') > -1) ||
				   	(tweetLowerCase.indexOf('head in a comfortable bed') > -1)
				   ) {
						statsTracker.rejectTracker.repetition++;
						continue;
				}

				// Keep within preferred character length
				var tweetLengthMin = 30,
					tweetLengthMax = 65,
					tweetMultiLengthMin = 45,
					tweetMultiLengthMax = 65,
					tweetRegularLengthMin = 30,
					tweetRegularLengthMax = 47;


				if ((tweetLowerCase.length <= tweetLengthMax) && (tweetLowerCase.length >= tweetLengthMin)) {
				} else {
					statsTracker.rejectTracker.length++;
					continue;
				}

				// Remove punctuation
				var ritaTweet = tweetLowerCase.replace(/[?.,-\/#!$%\^&\*;:{}=\-_`~()]/g,""),
					ritaTweetWordsArray = ritaTweet.split(" ");

				var slangFound = 0,
					maxSlangAllowed = 0,
					hasSlang = false;

				var wordPos = ritaTweetWordsArray.lastIndexOf(word),
					maxDistanceUntilEnd = 4,
					isMultiline = false;

				var prefix = '',
					suffix = '';

				// Is our word within X characters of the end of the tweet?
				if ((ritaTweetWordsArray.length - wordPos) <= maxDistanceUntilEnd ) {

					// Is our word NOT the last word in the tweet?
					if ((ritaTweetWordsArray.length - wordPos) > 1) {
						isMultiline = true;

						var wordPosStart = tweetOriginal.toLowerCase().lastIndexOf(word),
							wordPosEnd = wordPosStart + word.length + 1;

						var prefix = tweetOriginal.slice(0, wordPosEnd),
							suffix = tweetOriginal.slice(wordPosEnd);

							suffix = suffix.trim();

						prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);

						// Is last character in suffix appropriate punctuation? Is yes, add space.
						if (/[?!.]/.test(suffix.charAt(suffix.length-1))) {
							suffix += " ";
						} else {
							statsTracker.rejectTracker.punctuationMisMatchAtEnd++;
							continue;
						}
					} else {
						// Our word is the last word in the tweet
						isMultiline = false;
					};
				} else {
					// console.log("- notNearEnd: ");
					statsTracker.rejectTracker.notNearEnd++;
					continue;
				}

				// Check lexicon for words, mark all else as slang
				for (var p = 0; p < ritaTweetWordsArray.length; p++) {
					if (lexicon.containsWord(ritaTweetWordsArray[p]) == undefined) {
						// console.log("Flagged: " + ritaTweetWordsArray[p]);
						slangFound++;

						if (slangFound > maxSlangAllowed) {
							// console.log('Has Slang: ' + tweetLowerCase);
							hasSlang = true;
							break;
						};
					};
				};

				if (hasSlang) {
					statsTracker.rejectTracker.slang++;
					continue;
				};


				var multiRegularLengthCheck = false;

				// If multi, range needs to be 50 - 70
				// If regular, range needs to be < 50 > 35.
				// Ensure that word exists within 25% of total tweet length;
				if ((isMultiline)
					&& (tweetLowerCase.length >= tweetMultiLengthMin)
					&& (tweetLowerCase.length <= tweetMultiLengthMax)) {
						multiRegularLengthCheck = true;
						statsTracker.hasMultiline++;
				} else if ((isMultiline == false)
					&& (tweetLowerCase.length >= tweetRegularLengthMin)
					&& (tweetLowerCase.length <= tweetRegularLengthMax)) {
						multiRegularLengthCheck = true;
				};

				if (multiRegularLengthCheck == false) {
					statsTracker.rejectTracker.length++;
					continue;
				}

				var tweetData = {
					tweet: tweetOriginal,
					tweetID: currentTweetID,
					tweetLength: tweetLowerCase.length,
					multiline: isMultiline,
					tweetPrefix: prefix,
					tweetSuffix: suffix,
					userID: currentUserID,
					userScreenName: currentUserScreenName,
					url: "http://twitter.com/" + currentUserScreenName + "/status/" + currentTweetID
				};

				statsTracker.accepted++;
				twitterResults.push(tweetData);

				if (isMultiline) {
					console.log('M ' + tweetData.tweet + " (" + tweetLowerCase.length + ")");
					console.log('   Prefix: ' + prefix);
					console.log('   Suffix: ' + suffix);
				} else {
					console.log("+ " + tweetData.tweet + " (" + tweetLowerCase.length + ")");
				}
			}

			// Do we have more than one example with this word?
			// If so, randomize and reduce to one.
			if (twitterResults.length > 1) {
				twitterResults = _.shuffle(twitterResults);
			}

			twitterResults = twitterResults.slice(0, 1);

			cb(null, twitterResults);
		} else {
			// Error, most likely rate limit reached. Continue anyways.
			console.log(err);
			cb("There was an error getting a public Tweet.");
			// cb(null, twitterResults);
		}
    });
};


gatherAndCleanPhrases = function(botData, cb) {
	var rhymesData = botData.rhymeSchemeArray;

	// We have a lot of empty arrays in botData.rhymeSchemeArray. Remove empties.
	for (var i = rhymesData.length - 1; i >= 0; i--) {
	    if (rhymesData[i].length > 0) {
	        for (var j = rhymesData[i].length - 1; j >= 0; j--) {
	        	if (rhymesData[i][j].length > 0) {
		        	for (var k = rhymesData[i][j].length - 1; k >= 0; k-- ) {
		        		// Starts with a non-letter? Or contains hard return? Remove it.
		        		if ((/[a-zA-Z]+/.test(rhymesData[i][j][k].tweet.charAt(0)) == false)
		        			|| (/[\"\n]+/).test(rhymesData[i][j][k].tweet)) {
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

	// Additional check for empty arrays
	for (var x = rhymesData.length - 1; x >= 0; x--) {
		for (var y = rhymesData[x].length - 1; y >= 0; y--) {
			if (rhymesData[x][y].length == 0) {
				rhymesData[x].splice(y, 1);
			}
		}

		if (rhymesData[x].length == 0) {
			rhymesData.splice(x, 1);
		}
	};


	// console.log(' ');
	// console.log('--------- Before ---------');
	// console.log(JSON.stringify(rhymesData));
	// console.log('---------');
	// console.log(' ');


	// Removing duplicates using Levenshtein Distance
	var tempArray = [];

	for (var a = 0; a < rhymesData.length; a++) {
		tempArray[a] = [];
		for (var b = 0; b < rhymesData[a].length; b++) {
			tempArray[a][b] = [];
			if (tempArray.length > 0) {
				var isOriginal = true;
				for (var c = b + 1; c < rhymesData[a].length; c++) {
					var distance = levenshtein.get(rhymesData[a][b][0].tweet.toLowerCase(), rhymesData[a][c][0].tweet.toLowerCase());
					if (distance < levenshteinThreshold) {

						console.log(' ');
						console.log('|| Levenshtein Distance ||');
						console.log(rhymesData[a][b][0].tweet.toLowerCase());
						console.log(rhymesData[a][c][0].tweet.toLowerCase());
						console.log('Distance: ' + distance);
						console.log(' ');

						isOriginal = false;
						break;
					}
				}
			} else {
				tempArray[a][b].push(rhymesData[a][b][0]);
			}

			if (isOriginal) {
				tempArray[a][b].push(rhymesData[a][b][0]);
			}
		}
	}

	rhymesData = tempArray;

	// console.log(' ');
	// console.log('--------- After ---------');
	// console.log(JSON.stringify(rhymesData));
	// console.log('---------');
	// console.log(' ');


	botData.rhymeSchemeArray = rhymesData;
	cb(null, botData);
}

checkRequirements = function(botData, cb) {
	var rhymeSets = botData.rhymeSchemeArray;
	var totalRhymeSets = rhymeSets.length;

	console.log(' ');
	console.log('+++++++++');
	console.log(JSON.stringify(rhymeSets));


	if (totalRhymeSets >= 2) {

		// Locate "A Phrases." We need 7.
		for (var i = 0; i < rhymeSets.length; i++) {
			rhymeSets[i] = _.uniq(rhymeSets[i]);

			if (rhymeSets[i].length >= 7) {
				var totalMultilines = 0,
					totalRegularLines = 0,
					totalNeededLines = 7,
					minRegularLines = 2;

				var allPhrases = [],
					multilinePhrases = [],
					regularPhrases = [];

				allPhrases = rhymeSets[i];

				// Determine multi vs regular lines
				for (var a = 0; a < allPhrases.length; a++) {
					allPhrases[a] = allPhrases[a][0];

					console.log('allPhrases[' + a + ']: ' + JSON.stringify(allPhrases[a]));

					// Terrible fix.
					if (allPhrases[a] != undefined) {
						allPhrases[a].tweet = allPhrases[a].tweet.charAt(0).toUpperCase() + allPhrases[a].tweet.slice(1);

						if (allPhrases[a].multiline) {
							totalMultilines++;
							multilinePhrases.push(allPhrases[a]);
						} else {
							totalRegularLines++;
							regularPhrases.push(allPhrases[a]);
						}
					}
				};

				// Do we have enough?
				if ((totalRegularLines >= minRegularLines) && (totalMultilines >= (totalNeededLines - totalRegularLines))) {
					regularPhrases = _.shuffle(regularPhrases);
					multilinePhrases = _.shuffle(multilinePhrases);

					var combinedPhrases = regularPhrases.concat(multilinePhrases);

					botData.aPhrases[0] = combinedPhrases[0];
					botData.aPhrases[1] = combinedPhrases[1];

					var remainingPhrases = combinedPhrases.slice(2);
					remainingPhrases = _.shuffle(remainingPhrases);

					botData.aPhrases = botData.aPhrases.concat(remainingPhrases);
					botData.aPhrases = botData.aPhrases.slice(0, 7);

					botData.aPhrasesQuotaMet = true;
					rhymeSets.splice(i, 1);
					break;
				}
			}
		}





		// Local "B Phrases." We need 6.
		if (botData.aPhrasesQuotaMet) {

			for (var j = 0; j < rhymeSets.length; j++) {
				// console.log(" ");
				console.log(">>> B Phrases Loop");
				// console.log("Before: rhymeSets[j]: " + JSON.stringify(rhymeSets[j]));
					rhymeSets[j] = _.uniq(rhymeSets[j]);
				console.log("After: rhymeSets[j]: " + JSON.stringify(rhymeSets[j]));


				// Remove all multilines
				var allPhrases = [],
					regularPhrases = [];

				allPhrases = rhymeSets[j];

				for (var z = 0; z < allPhrases.length; z++) {
					// console.log(' ');
					// console.log('z: ' + z);
					// console.log('allPhrases[z]: ' + JSON.stringify(allPhrases[z]));
					// console.log(' ');

					// Prevent against empty arrays
					if (allPhrases[z].length > 0) {
						if ((allPhrases[z][0].multiline) == false) {
							regularPhrases.push(allPhrases[z][0]);
						}
					};
				};

				rhymeSets[j] = regularPhrases;

				var duplicatesExist = false;

				if (rhymeSets[j].length >= 6) {
					botData.bPhrases = rhymeSets[j];

					// Check if any b phrases match a phrases.
					for (var b = botData.bPhrases.length - 1; b >= 0; b--) {
						botData.bPhrases[b].tweet = botData.bPhrases[b].tweet.charAt(0).toUpperCase() + botData.bPhrases[b].tweet.slice(1);

						for (var x = 0; x < botData.aPhrases.length; x++) {
							if (botData.bPhrases[b].tweet == botData.aPhrases[x].tweet) {
								duplicatesExist = true;
								break;
							}
						}

						if (duplicatesExist) {
							botData.bPhrases.splice(b, 1);
						}
					}

					botData.bPhrases = _.sortBy(botData.bPhrases, 'tweetLength');

					if (botData.bPhrases.length >= 6) {
						// botData.bPhrases = _.shuffle(botData.bPhrases);
						botData.bPhrases = botData.bPhrases.slice(0, 6);
					};

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
	console.log("A Phrases: " + JSON.stringify(botData.aPhrases));
	console.log("B Phrases: " + JSON.stringify(botData.bPhrases));

	getTitle = function() {
		var theTitle = "",
			titleArray = _.union(botData.aPhrases, botData.bPhrases);

		titleArray.splice(0, 2);
		titleArray = _.shuffle(titleArray);

		for (var x = 0; x < titleArray; x++) {
			if (titleArray[x].tweet.length <= 33) {
				theTitle = titleArray[x].tweet;
				break;
			}
		}

		if (theTitle == "") {
			var randomPos = Math.floor(Math.random() * titleArray.length);
			theTitle = titleArray[randomPos].tweet;
		}

		theTitle = theTitle.replace(/\w\S*/g, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});

		var hasPunctuation = false;
		if (/[?!.;]/.test(theTitle)) {
			if (theTitle.indexOf('?') != -1) {
				theTitle = theTitle.slice(0, theTitle.indexOf('?'));
			};
			if (theTitle.indexOf('!') != -1) {
				theTitle = theTitle.slice(0, theTitle.indexOf('!'));
			};
			if (theTitle.indexOf('.') != -1) {
				theTitle = theTitle.slice(0, theTitle.indexOf('.'));
			};
			if (theTitle.indexOf(';') != -1) {
				theTitle = theTitle.slice(0, theTitle.indexOf(';'));
			};
		};

		if (theTitle.charAt(theTitle.length-1) == ";") {
			theTitle = theTitle.substr(0, theTitle.length-1);
		};

		// while ((theTitle.charAt(theTitle.length-1) == ".") || (theTitle.charAt(theTitle.length-1) == ",") || (theTitle.charAt(theTitle.length-1) == ";")) {
		//     theTitle = theTitle.substr(0, theTitle.length-1);
		// };

    botData.tumblrPostTitle = theTitle;
		return theTitle;
	}

	// Determine each line
	var A1, A2,
		a1, a2, a3, a4, a5,
		b1, b2, b3, b4, b5, b6;

	// Assign
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

	var poemTitle = getTitle();
	var poemBody = [];

	poemBody[0] = "<p class=\"tercet\"><a href=\"" + A1.url + "\">" + A1.tweet + "</a><br />";
	poemBody[1] = "<a href=\"" + b1.url + "\">" + b1.tweet + "</a><br />";
	poemBody[2] = "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>";

	// Not terribly DRY here.
	if (a1.multiline) {
		poemBody[3] = "<p class=\"tercet\"><a href=\"" + a1.url + "\">" + a1.tweetPrefix + "<br />"
		poemBody[4] = a1.tweetSuffix + "</a><a href=\"" + b2.url + "\">" + b2.tweet + "</a><br />"
	} else {
		poemBody[3] = "<p class=\"tercet\"><a href=\"" + a1.url + "\">" + a1.tweet + "</a><br />"
		poemBody[4] = "<a href=\"" + b2.url + "\">" + b2.tweet + "</a><br />"
	};
	poemBody[5] = "<a href=\"" + A1.url + "\">" + A1.tweet + "</a></p>";

	if (a2.multiline) {
		poemBody[6] = "<p class=\"tercet\"><a href=\"" + a2.url + "\">" + a2.tweetPrefix + "<br />"
		poemBody[7] = a2.tweetSuffix + "</a><a href=\"" + b3.url + "\">" + b3.tweet + "</a><br />"
	} else {
		poemBody[6] = "<p class=\"tercet\"><a href=\"" + a2.url + "\">" + a2.tweet + "</a><br />"
		poemBody[7] = "<a href=\"" + b3.url + "\">" + b3.tweet + "</a><br />"
	};
	poemBody[8] = "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>";

	if (a3.multiline) {
		poemBody[9] = "<p class=\"tercet\"><a href=\"" + a3.url + "\">" + a3.tweetPrefix + "<br />"
		poemBody[10] = a3.tweetSuffix + "</a><a href=\"" + b4.url + "\">" + b4.tweet + "</a><br />"
	} else {
		poemBody[9] = "<p class=\"tercet\"><a href=\"" + a3.url + "\">" + a3.tweet + "</a><br />"
		poemBody[10] = "<a href=\"" + b4.url + "\">" + b4.tweet + "</a><br />"
	};
	poemBody[11] = "<a href=\"" + A1.url + "\">" + A1.tweet + "</a></p>";

	if (a4.multiline) {
		poemBody[12] = "<p class=\"tercet\"><a href=\"" + a4.url + "\">" + a4.tweetPrefix + "<br />"
		poemBody[13] = a4.tweetSuffix + "</a><a href=\"" + b5.url + "\">" + b5.tweet + "</a><br />"
	} else {
		poemBody[12] = "<p class=\"tercet\"><a href=\"" + a4.url + "\">" + a4.tweet + "</a><br />"
		poemBody[13] = "<a href=\"" + b5.url + "\">" + b5.tweet + "</a><br />"
	};
	poemBody[14] = "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>";

	if (a5.multiline) {
		poemBody[15] = "<p class=\"tercet\"><a href=\"" + a5.url + "\">" + a5.tweetPrefix + "<br />"
		poemBody[16] = a5.tweetSuffix + "</a><a href=\"" + b6.url + "\">" + b6.tweet + "</a><br />"
	} else {
		poemBody[15] = "<p class=\"tercet\"><a href=\"" + a5.url + "\">" + a5.tweet + "</a><br />"
		poemBody[16] = "<a href=\"" + b6.url + "\">" + b6.tweet + "</a><br />"
	};
	poemBody[17] = "<a href=\"" + A1.url + "\">" + A1.tweet + "</a><br />";
	poemBody[18] = "<a href=\"" + A2.url + "\">" + A2.tweet + "</a></p>";


	poemBody = poemBody.join('');

	var credits = "<p class=\"credits\">This <a href=\"https://en.wikipedia.org/wiki/Villanelle\">villanelle</a> was made with tweets by: "
			+ "<a href=\"" + A1.url + "\">@" + A1.userScreenName + "</a>, "
			+ "<a href=\"" + A2.url + "\">@" + A2.userScreenName + "</a>, "
			+ "<a href=\"" + a1.url + "\">@" + a1.userScreenName + "</a>, "
			+ "<a href=\"" + a2.url + "\">@" + a2.userScreenName + "</a>, "
			+ "<a href=\"" + a3.url + "\">@" + a3.userScreenName + "</a>, "
			+ "<a href=\"" + a4.url + "\">@" + a4.userScreenName + "</a>, "
			+ "<a href=\"" + a5.url + "\">@" + a5.userScreenName + "</a>, "
			+ "<a href=\"" + b1.url + "\">@" + b1.userScreenName + "</a>, "
			+ "<a href=\"" + b2.url + "\">@" + b2.userScreenName + "</a>, "
			+ "<a href=\"" + b3.url + "\">@" + b3.userScreenName + "</a>, "
			+ "<a href=\"" + b4.url + "\">@" + b4.userScreenName + "</a>, "
			+ "<a href=\"" + b5.url + "\">@" + b5.userScreenName + "</a>, and "
			+ "<a href=\"" + b6.url + "\">@" + b6.userScreenName + "</a>."
			+ "</p>"

		+ "<p class=\"attribution\">Coding: <a href=\"http://twitter.com/avoision\">@avoision</a></p>";


	var villanelle = poemBody + credits;

	cb(null, botData, poemTitle, villanelle);
}

// Make it so
publishPoem = function(botData, poemTitle, villanelle, cb) {
	var blogName = "villanellebot",
		options = {
			title: poemTitle,
			body: villanelle
		}

	tumblrClient.createTextPost(blogName, options, function(err, success) {
		if (!err) {
			console.log("Success: " + JSON.stringify(success));
      botData.tumblrPostID = success.id_string;
      var convertedTitle = poemTitle.replace(/\s+/g, '-').toLowerCase();
      console.log(`http://villanellebot.tumblr.com/post/${botData.tumblrPostID}/${convertedTitle}`);
			cb(null, botData);
		} else {
			console.log("Errors: " + err);
		}
	});
}

favoriteTweets = function(botData, cb) {
	console.log("========= Favorite Tweets =========");
	var tweetIDs = [];
	// var tweetIDs = ['635617733611155456', '635599146792017920', '635148439718903808'];

	for (a = 0; a < botData.aPhrases.length; a++) {
		tweetIDs.push(botData.aPhrases[a].tweetID);
	};

	for (b = 0; b < botData.bPhrases.length; b++) {
		tweetIDs.push(botData.bPhrases[b].tweetID);
	};

	botData.counter = 0;

	for (f = 0; f < tweetIDs.length; f++ ) {
	    tf.post('favorites/create', {id: tweetIDs[f]}, function(err, data, response, f) {
	    	if (!err) {
	    		console.log("Favorited: " + data.id);
	    	} else {
	    		var phrase = "";
	    		console.log("f is: " + f);
	    		if (f <= 6) {
	    			// phrase = botData.aPhrases[f].tweet;
					console.log("   ! Repeat: " + JSON.stringify(botData.aPhrases[f]));
	    		} else {
	    			// phrase = botData.bPhrases[(f - 6)].tweet;
	    			console.log("   ! Repeat: " + JSON.stringify(botData.bPhrases[(f - 6)]));
	    		}
	    		// console.log("   ! Repeat: " + phrase);
	    	}

	    	botData.counter++;
	    	if (botData.counter >= tweetIDs.length) {
				cb(null, botData);
	    	}
	    });
	}
}

announcePoem = function(botData, cb) {
  var announceText = "\"" + botData.tumblrPostTitle + "\" - ";
  var convertedTitle = botData.tumblrPostTitle.replace(/\s+/g, '-').toLowerCase();
  var poemURL = `http://villanellebot.tumblr.com/post/${botData.tumblrPostID}/${convertedTitle}`;

	tf.post('statuses/update', { status: announceText + poemURL }, function(err, data, response) {
  		if (!err) {
  			console.log("Villanelle Announced!");
  		} else {
  			console.log(err);
  		}
		cb(null);
	});
}

rateLimitCheck = function(cb) {
	console.log('---------------------------');
    t.get('application/rate_limit_status', {resources: 'search'}, function (err, data, response) {
		if (!err) {
			var dataRoot = data.resources.search['/search/tweets'],
				limit = dataRoot.limit,
				remaining = dataRoot.remaining,
				resetTime = dataRoot.reset + "000",
				currentTime = (new Date).getTime().toString(),
				msRemaining = resetTime - currentTime,
				totalSecsRemaining = Math.floor(msRemaining / 1000),
				minRemaining = Math.floor(totalSecsRemaining/60),
				secRemaining = totalSecsRemaining%60;

			if (secRemaining < 10) { secRemaining = "0" + secRemaining; }

			var timeUntilReset = new Date(0);
			timeUntilReset.setUTCSeconds(dataRoot.reset);

			var hour = timeUntilReset.getHours();
			if (hour > 12) { hour = hour - 12; };
			var min = timeUntilReset.getMinutes();
			if (min < 10) { min = "0" + min; };
			var sec = timeUntilReset.getSeconds();
			if (sec < 10) { sec = "0" + sec; };

			console.log("Rate limit: " + remaining + "/" + limit);
			console.log("Next reset at: " + hour + ":" + min + ":" + sec + " in " + minRemaining + ":" + secRemaining );

			console.log('---------------------------');
			console.log(JSON.stringify(statsTracker));
		}
	});
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
		formatPoem,
		publishPoem,
		// favoriteTweets,
		announcePoem,
		rateLimitCheck
    ],
    function(err, botData) {
		if (err) {
			console.log('Error: ', err);
			rateLimitCheck();
		}
    });
}

run();