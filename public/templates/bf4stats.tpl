<link rel="stylesheet" type="text/css" href="/plugins/nodebb-widget-r6stats-vrk/public/css/style.css">
<div id="bf4leaderboard">
  <script>
    function showData(target){
      var tr = target.nextElementSibling
      if(tr.style.display === 'none'){
        tr.style.display = 'block'
      } else {
        tr.style.display = 'none'
      }
      // console.log(target.nextElementSibling.style.display)
    }
  </script>

  <div class="container">
    <div class="row table-header">
      <div class="col-md-12 text-center">
        <h3>Battlefield 4 Leaderboard</h3>
        <hr/>
      </div>

    </div>

    <div class="row table-title">
      <div class="col-md-3 text-uppercase text-center"><strong>Name</strong></div>
      <div class="col-md-1 text-uppercase"><strong>K/D</strong></div>
      <div class="col-md-1 text-uppercase"><strong>W/L</strong></div>
      <div class="col-md-1 text-uppercase"><strong>SPM</strong></div>
      <div class="col-md-1 text-uppercase"><strong>KPM</strong></div>
      <div class="col-md-1 text-uppercase"><strong>Skill</strong></div>
      <div class="col-md-2 text-uppercase"><strong>Time Played</strong></div>
      <div class="col-md-2 text-uppercase"><strong>Rank</strong></div>
    </div>
    <hr/>
    <!-- IF players.length -->
      <!-- BEGIN players -->
      <div class="row table-row">

        <div class="row">
          <div>
            <div class="col-md-1">
              <!-- IF players.name -->
              <img class="player-image" src="{players.picture}" />
              <!-- END players.name -->
            </div>
            <div class="col-md-2">
              <h5 class="text-uppercase">{players.name}</h5>
            </div>

            <div class="col-md-1">{players.stats.kd}</div>
            <div class="col-md-1">{players.stats.wins} / {players.stats.losses}</div>
            <div class="col-md-1">{players.stats.spm}</div>
            <div class="col-md-1">{players.stats.kpm}</div>
            <div class="col-md-1">{players.stats.skill}</div>
            <div class="col-md-2">{players.stats.timePlayed}</div>
            <div class="col-md-2">
              <div class="row">
              <p class="text-left">{players.stats.rank.name}</p>
              <!-- IF players.stats.rank.image -->
                <img class="op_badge" src=" {players.stats.rank.image}" />
              <!-- ENDIF players.stats.rank.image -->
            </div>
            </div>

          </div>
        </div>
        <hr/>
      </div>
      <!-- END players -->
    <!-- END players.length -->


</div>
