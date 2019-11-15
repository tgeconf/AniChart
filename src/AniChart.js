import ChartSpec from './ChartSpec.js';
import FacetSpec from './FacetSpec.js';
import TimingSpec from './TimingSpec.js';
import Animation from "./Animation.js";
import Util from './util/Util.js';

class AniChart {
    constructor() {
        this.chartSpecs;
        this.facet;
        this._animations;
    }

    set animations(aniJson) {
        let idxAniJson = aniJson.map(tmpAni => {
            tmpAni.chartIdx = 0
            return tmpAni;
        });
        let chartNum = 0;//number of charts
        if (this.facet) {
            chartNum = this.facet.views[0].length;
        } else {
            chartNum = this.chartSpecs.length;
        }
        if (chartNum > 1) {//more than 1 input chart
            for (let i = 1; i < chartNum - 1; i++) {
                let tmpAniJson = Util.deepClone(aniJson);
                tmpAniJson[0].reference = TimingSpec.timingRef.previousEnd;
                let tmpIdxAniJson = tmpAniJson.map(tmpAni => {
                    tmpAni.chartIdx = i;
                    return tmpAni;
                })
                idxAniJson.push(...tmpIdxAniJson);
            }
        }
        this._animations = idxAniJson;
    }

    get animations() {
        return this._animations;
    }

    static loadSpec(url, callback) {
        let xhr = new XMLHttpRequest(),
            okStatus = document.location.protocol === "file:" ? 0 : 200;
        xhr.open('GET', url, false);
        xhr.overrideMimeType("text/html;charset=utf-8");
        xhr.send(null);
        if (xhr.status === okStatus) {
            let spec = xhr.responseText;
            callback(JSON.parse(spec));
        } else if (xhr.status === 404) {
            console.log('can not find ' + url + ' ! Please check the url.');
        }
    }

    init(spec) {
        this.chartSpecs = [];
        let aniChartObj = spec;

        //deal with input charts
        for (let i = 0; i < aniChartObj.charts.length; i++) {
            let chartName = typeof aniChartObj.charts[i].id === 'undefined' ? 'chart' + i : aniChartObj.charts[i].id;
            let tmpChart = new ChartSpec(chartName, aniChartObj.charts[i].source);
            this.chartSpecs.push(tmpChart);
        }

        //init facet
        if (aniChartObj.facet) {
            this.facet = new FacetSpec(aniChartObj.facet.type, aniChartObj.facet.views);
        }

        ChartSpec.loadCharts(this.chartSpecs, this.facet);
        let svgChart = ChartSpec.removeTransAndMerge();
        document.getElementById('chartContainer').innerHTML = '';
        document.getElementById('chartContainer').appendChild(svgChart);
        let bBoxes = ChartSpec.getBBoxes();
        let animateChart = ChartSpec.processAnimateChart(document.getElementById('chartContainer').innerHTML, bBoxes);
        document.getElementById('videoContainer').innerHTML = '';
        document.getElementById('videoContainer').appendChild(animateChart);

        //deal with animations
        this.animations = aniChartObj.animations;

        if (Array.isArray(this.animations)) {
            let lastAnimation;
            for (let aniIdx = 0; aniIdx < this.animations.length; aniIdx++) {
                let animationJson = this.animations[aniIdx];

                //use the selection in animation to select marks and record dom attrs
                let tmpContainer = document.createElement('div');
                document.body.appendChild(tmpContainer);
                tmpContainer.innerHTML = ChartSpec.charts[animationJson.chartIdx].outerHTML;
                let marks = tmpContainer.querySelectorAll(animationJson.selection);

                let usedChangedAttrs = [];
                for (let i = 0; i < ChartSpec.changedAttrs.length; i++) {
                    usedChangedAttrs.push(ChartSpec.changedAttrs[i]);
                }

                let animation = new Animation();
                animation.translate(animationJson, usedChangedAttrs);//translate from json obj to Animation obj

                let markIds = [];//record all ids of selected marks

                if (marks.length > 0) {
                    [].forEach.call(marks, function (mark) {
                        if(mark.classList.contains('mark')){
                            let markId = mark.getAttribute('id');
                            markIds.push(markId);

                            //process path
                            if (mark.tagName === 'path') {//consider the linkage shape later
                                let markJSON = Util.toJSON(mark);
                                let transformedAttrs = Util.discretizePath(markJSON);

                                if (transformedAttrs) {
                                    if (transformedAttrs.type === 'lines') {
                                        for (let i = 0; i < transformedAttrs.data.length; i++) {
                                            markJSON.attr['x' + (1 + 2 * i)] = transformedAttrs.data[i][0][0];
                                            markJSON.attr['y' + (1 + 2 * i)] = transformedAttrs.data[i][0][1];
                                            markJSON.attr['x' + (2 + 2 * i)] = transformedAttrs.data[i][1][0];
                                            markJSON.attr['y' + (2 + 2 * i)] = transformedAttrs.data[i][1][1];
                                        }
                                    } else {
                                        let tfAttrsDataKeys = Object.keys(transformedAttrs.data);

                                        for (let i = 0; i < tfAttrsDataKeys.length; i++) {
                                            let tAttr = tfAttrsDataKeys[i];
                                            if (tAttr === 'radius') {
                                                if (transformedAttrs.data[tAttr].length > 1) {
                                                    markJSON.attr.innerRadius = transformedAttrs.data[tAttr][0].rx + 1;
                                                    markJSON.attr.outterRadius = transformedAttrs.data[tAttr][1].rx - 1;
                                                } else {
                                                    markJSON.attr.innerRadius = 0;
                                                    markJSON.attr.outterRadius = transformedAttrs.data[tAttr][0].rx - 1;
                                                }
                                            } else {
                                                markJSON.attr[tAttr] = transformedAttrs.data[tAttr];
                                            }
                                        }
                                    }
                                    mark = Util.toDOM(markJSON);
                                }
                            }

                            let tmpDomAttrObj = {};
                            let attrArr = [...mark.attributes];
                            for (let i = 0; i < attrArr.length; i++) {
                                let attrName = attrArr[i];
                                tmpDomAttrObj[attrName.name] = mark.getAttribute(attrName.name);
                            }
                            let markDom = document.getElementById(markId);
                            tmpDomAttrObj['bbWidth'] = markDom.getBBox().width;
                            tmpDomAttrObj['bbHeight'] = markDom.getBBox().height;
                            tmpDomAttrObj['bbX'] = markDom.getBBox().x;
                            tmpDomAttrObj['bbY'] = markDom.getBBox().y;
                            tmpDomAttrObj['content'] = mark.textContent;
                            tmpDomAttrObj['id'] = markId;
                            let dataDatumAttrValue = JSON.parse(mark.getAttribute('data-datum'));
                            if (Array.isArray(dataDatumAttrValue)){
                                dataDatumAttrValue = dataDatumAttrValue[0];
                            }
                            tmpDomAttrObj['data-datum'] = dataDatumAttrValue;
                            if (mark.tagName === 'path' || mark.tagName === 'line') {
                                tmpDomAttrObj['stroke-dasharray'] = document.getElementById(markId).getTotalLength();
                                tmpDomAttrObj['stroke-dashoffset'] = document.getElementById(markId).getTotalLength();
                            }
                            animation.domMarks.set(markId, tmpDomAttrObj);
                        }
                    })
                }
                animation.calAniTime(markIds, lastAnimation);
                lastAnimation = animation;
                document.body.removeChild(tmpContainer);
            }
        }
    }

    render() {
        Animation.renderAnimation();
    }
}

export default AniChart;