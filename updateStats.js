var async =  require('async'),
fs = require('fs'),
path = require('path'),
util = require("util"),
MongoClient = require('mongodb').MongoClient,
assert = require('assert'),
url = 'mongodb://localhost:27017/0',
BattlefieldStats = require('battlefield-stats'),
players = [],
config = require(path.resolve(__dirname,'./config.json'));

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
