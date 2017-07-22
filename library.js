'use strict';

var async =  module.parent.require('async'),
fs = require('fs'),
path = require('path'),
templates = module.parent.require('templates.js'),
db = require.main.require('./src/database'),
util = require("util"),
cron = require.main.require('cron').CronJob,
MongoClient = require('mongodb').MongoClient,
assert = require('assert'),
url = 'mongodb://localhost:27017/0',
BattlefieldStats = require('battlefield-stats'),
players = [],
cronJobs = [],
config = require(path.resolve(__dirname,'./config.json')),
app;

var Widget = {
	templates: {}
};

//setup cron job
cronJobs.push(new cron('15 0 * * *', function(){
	console.log('[bf4stats-vrk] - UPDATING BFSTATS')
	Widget.updateStats()
}, null, false));

Widget.init = function(params, callback) {
  console.log('[bf4stats-vrk] - bf4stats init')
	console.log(config)
  app = params.app;
	reStartCronJobs()
  var templatesToLoad = [
    'widget.tpl',
    'bf4stats.tpl'
  ];

  function loadTemplate(template, next){
    fs.readFile(path.resolve(__dirname,'./public/templates/' + template), function(err,data){
      if(err){
        console.log('[bf4stats-vrk] - ' + err.message);
        return next(err);
      }
      Widget.templates[template] = data.toString();
      next(null);
    });
  }

  async.each(templatesToLoad, loadTemplate);

  callback();
};

Widget.renderBF4StatsWidget = function(widget, callback) {
  var lookup_keys = []
  var players = []

  async.waterfall([
    function(callback){
			db.getSortedSetRangeWithScores('username:uid',0,-1,function(err,res){
				var results = res
				results.forEach(function(u){
					lookup_keys.push('user:' + u.score + ':bf4stats')
				})
				callback()
			})
    },
		function(callback){
			db.getObjects(lookup_keys,function(err, results){
				results.forEach(function(u){
					if(typeof u !== 'undefined'){
						if(u.stats.kills > 0){
							players.push(u)
						}
					}
				})
				callback()
			})
		},
		function(callback){
			async.sortBy(players,
				function(player,callback){
					callback(null, player.stats.kd * -1)
				},
				function(err,result){
					players = result
					callback()
				})
		}
  ],function(err,result){
		// console.log(players)
		var rep = {
			players: players
		};

	  var pre = ""+fs.readFileSync(path.resolve(__dirname,'./public/templates/bf4stats.tpl'));
		widget.html = templates.parse(pre, rep)
		// callback(null, templates.parse(pre, rep));
		callback(null, widget);
  })


};

Widget.defineWidgets = function(widgets, callback) {
  widgets = widgets.concat([
  		{
  			widget: "bf4stats-vrk",
  			name: "bf4stats-vrk",
  			description: "Widget to display BF1 Leaderboard VRK",
  			content: Widget.templates['widget.tpl']
  		}
  	]);
    callback(null, widgets);
};

Widget.updateStats = function(){
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err)
	  console.log('[bfstats-vrk] - Connected correctly to server')
		var bf = new BattlefieldStats(config.apikey)
	  getOriginIds(db,function(origin_ids){
	    async.waterfall([
	      function(callback){
	        var oldStats = db.collection('objects')
	        oldStats.deleteMany({ _key : /.*bf4stats.*/})
	        .then(callback())
	      },
	      function(callback){
	        // console.log(JSON.stringify(origin_ids))
	        async.each(origin_ids,
	          function(u,cb){
	            var params = {platform: bf.Platforms.PC, displayName: u.origin_id, game: 'bf4'}
	            bf.Api.request('/Stats/BasicStats', params, function(err,res){
	              if(!err && res){
	                if(res.successful == true){
	                  // console.log(JSON.stringify(res))
	                  var kd = res.result.deaths > 0 ? (res.result.kills / res.result.deaths) : (res.result.kills / 1)
	                  var playerStats = {
	                    _key : 'user:' + u._key.split(':')[1] + ':bf4stats',
	                    displayName: res.profile.displayName,
	                    trackerUrl: res.trackerUrl,
	                    stats: {
	                      kills : res.result.kills,
	                      wins: res.result.wins,
	                      deaths: res.result.deaths,
	                      spm: res.result.spm,
	                      skill: res.result.skill,
	                      soldierImageUrl: res.result.soldierImageUrl,
	                      kpm: res.result.kpm,
	                      losses: res.result.losses,
	                      timePlayed:  Math.floor(res.result.timePlayed / 3600 ) + ' h ' + Math.floor((res.result.timePlayed % 3600) / 60) + ' m',
	                      kd: kd.toFixed(3),
	                      rank : {
	                        name : res.result.rank.name,
	                        number: res.result.rank.number,
	                        image: res.bbPrefix + res.result.rank.imageUrl.substring(11)
	                      }
	                    }
	                  }
	                  players.push(playerStats)
	                  cb()
	                }
	                else{
	                  cb()
	                }
	              }
	              else{
	                cb()
	              }
	            })
	          },
	          function(err,result){
	            // console.log(JSON.stringify(players))
	            callback()
	        })
	      },
	      function(callback){
	        async.eachOf(players,function(u,i,cb){
	          var key = u._key.split(':')[0] + ':' + u._key.split(':')[1]
	          getUserInfo(db,key,function(user){
	            players[i].name = user.username
	            players[i].picture = user.picture
	            cb()
	          })
	        },
	        function(err,res){
	          callback()
	        })
	      }
	    ],function(err,result){
	      // console.log(JSON.stringify(players))
	      insertBF1Stats(db, players, function(err,result){
	        if(err){
	          console.error('[bf4stats-vrk] - ' + err)
	        }
	        else{
	          console.log('[bf4stats-vrk] - Stats update complete')
	        }
	        db.close()
	      })
	    })
	  })

	})

	function getOriginIds(db, callback){
		  var collection = db.collection('objects')
		  collection.find({ origin_id : { $exists: true, $nin: ['', null] } })
		  .toArray(function(err, docs){
		    callback(docs)
		  })
	}

	function getUserInfo(db, userKey, callback){
		  var collection = db.collection('objects')
		  collection.find({ _key : { $exists: true, $eq: userKey } })
		  .toArray(function(err, docs){
		    callback(docs[0])
		  })
	}

	function insertBF1Stats(db, data, callback){
		  var collection = db.collection('objects')
		  collection.insertMany(data,function(err,result){
		    callback(err,result)
		  })
	}
}

function reStartCronJobs() {
	cronJobs.forEach(function(job) {
		console.log('[bf4stats-vrk] - Starting cron jobs')
		job.start();
	});
}

function stopCronJobs() {
	cronJobs.forEach(function(job) {
		job.stop();
	});
}

module.exports = Widget;
