let TimingSpec = require('./TimingSpec.js');
let Animation = require('./Animation.js');
let AniChart = require('./AniChart.js');
let Renderer = require('./Renderer.js');

window.aniChart = {
    frameRate: TimingSpec.FRAME_RATE,
    duration: () => {
        return Animation.wholeEndTime;
    },
    loadSpec: (url, callback) => {
        AniChart.loadSpec(url, callback);
    },
    renderSpec: (spec) => {
        let aniChartObj = new AniChart();
        aniChartObj.init(spec);
        aniChartObj.render();
    },
    play: () => {
        Renderer.play();
    },
    renderFrame: (time) => {//render frame of a specific timepoint
        return Renderer.renderFrame(time);
    },
    reset: function () {
        Renderer.resetCover();
        Animation.resetAll();
    },
    test: function(spec) {
        console.log('this is a test! ', spec);
    }
}