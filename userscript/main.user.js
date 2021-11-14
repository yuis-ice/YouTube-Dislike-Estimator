// ==UserScript==
// @name         YouTube Dislike Estimator
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Estimates the removed YT Dislike #BringBackDislikes
// @author       https://github.com/yuis-ice

// @match        https://youtube.com/watch* 
// @match        https://www.youtube.com/watch* 

// @require      https://unpkg.com/url-parse@1.5.1/dist/url-parse.js
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js

// @run-at       document-idle
// @noframes
// ==/UserScript==

// 
// utils 
// 

function getStandardDeviation(array) {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

const average = (array) => array.reduce((a, b) => a + b) / array.length;

const waitUntil = (condition) => {
    return new Promise((resolve) => {
        let interval = setInterval(() => {
            if (!condition()) return;
            clearInterval(interval)
            resolve()
        }, 100)
    })
}

const sleep = m => new Promise(r => setTimeout(r, m))

// 
// main 
// 

// (async function(){
// }) ();

async function main(){

    await waitUntil(() => typeof document.querySelector('span.view-count') !== "undefined");
    await waitUntil(() => typeof document.querySelector('yt-formatted-string[aria-label$=" likes"]') !== "undefined");
    await waitUntil(() => typeof Array.from(document.body.querySelectorAll("yt-formatted-string")).filter(a => a.textContent.match(/Dislike/)).reverse()[0] !== "undefined");
    
    await sleep(2000); 
        // issue, JS gets sometimes the previous video's data e.g. views, likes; 
        // e.g. 
        // it should be
        // 22: { url: "https://www.youtube.com/watch?v=z2Ui_VxnJCQ", views: "134963", likes: 4700,… }
        // 23: { url: "https://www.youtube.com/watch?v=RplefX2qk4s", views: "229674", likes: 8500,… }
        // but it might be 
        // 22: { url: "https://www.youtube.com/watch?v=z2Ui_VxnJCQ", views: "134963", likes: 4700,… }
        // 23: { url: "https://www.youtube.com/watch?v=RplefX2qk4s", views: "134963", likes: 4700,… }
        // thus, this sleep() is a quick workaround for this 
        // consider increase the value when you have a weak internet and/or cpu 

    // 
    // get info for the current page 
    // 
    
    views = document.querySelector("span.view-count").innerText.replace(/\D+/g, '');
    
    _likes = document.querySelector(`yt-formatted-string[aria-label$=" likes"]`).innerText;
    if (! _likes.match(/K|M/) ) likes = _likes 
    if (_likes.match(/K/)) likes = Number(_likes.replace(/K/, '')) * 1000
    if (_likes.match(/M/)) likes = Number(_likes.replace(/M/, '')) * 1000 * 1000
    
    likes_to_views = Number((Number(likes) / Number(views)).toFixed(3));
    

    // e.g. url = parse('https://www.youtube.com/watch?v=dy90tA3TT1c&list=hogehoge&index=14', true )
    url = URLParse(document.location.href, true);
    url = `${url.origin}/watch?v=${url.query.v}`;
    
    obj = {
        url: url,
        views: views,
        likes: likes,
        likes_to_views: likes_to_views,
    };
    
    
    // 
    // storing the data to LS 
    // 
    
    if (localStorage.getItem('_yt_dislike_estimator') == null) localStorage.setItem('_yt_dislike_estimator', '[]');
    
    if (localStorage.getItem('_yt_dislike_estimator') == null) data = [];
    if (localStorage.getItem('_yt_dislike_estimator') !== null) data = JSON.parse(localStorage.getItem('_yt_dislike_estimator'));
    
    json = JSON.stringify(data.concat(obj), null, 4);
    
    localStorage.setItem(
        '_yt_dislike_estimator',
        json
    );
    
    
    // 
    // html style adding w/ colorizing
    // 
    
    // e.g. lv_ratio_list = [0.042, 0.042, 0.052]
    // lv_ratio_list = JSON.parse(localStorage.getItem('_yt_dislike_estimator')).map(a => a.likes_to_views).filter(a => !isNaN(Number(a))).map(a => Number(a));
    // lv_ratio_list = JSON.parse(localStorage.getItem('_yt_dislike_estimator')).map(a => a.likes_to_views).filter(a => !isNaN(Number(a))).map(a => Number(a));
    _uniq = _.uniqBy(JSON.parse(localStorage.getItem('_yt_dislike_estimator')), 'url');
    lv_ratio_list = _uniq.map(a => a.likes_to_views).filter(a => !isNaN(Number(a))).map(a => Number(a));
    
    mean = average(lv_ratio_list);
    sd = getStandardDeviation(lv_ratio_list);
    
    var color;
    
    if (likes_to_views > mean + sd * 3.0) color = "#14ff14"
    if (likes_to_views > mean + sd * 2.5 && likes_to_views < mean + sd * 3.0) color = "#27ff27"
    if (likes_to_views > mean + sd * 2.0 && likes_to_views < mean + sd * 2.5) color = "#3bff3b"
    if (likes_to_views > mean + sd * 1.5 && likes_to_views < mean + sd * 2.0) color = "#4eff4e"
    if (likes_to_views > mean + sd * 1.0 && likes_to_views < mean + sd * 1.5) color = "#62ff62"
    if (likes_to_views > mean + sd * 0.5 && likes_to_views < mean + sd * 1.0) color = "#76ff76"
    if (likes_to_views > mean + sd * 0 && likes_to_views < mean + sd * 0.5) color = "#89ff89"
    
    if (likes_to_views <= mean + sd * -0 && likes_to_views > mean + sd * -0.5) color = "#ff8989"
    if (likes_to_views < mean + sd * -0.5 && likes_to_views > mean + sd * -1.0) color = "#ff7676"
    if (likes_to_views < mean + sd * -1.0 && likes_to_views > mean + sd * -1.5) color = "#ff6262"
    if (likes_to_views < mean + sd * -1.5 && likes_to_views > mean + sd * -2.0) color = "#ff4e4e"
    if (likes_to_views < mean + sd * -2.0 && likes_to_views > mean + sd * -2.5) color = "#ff3b3b"
    if (likes_to_views < mean + sd * -2.5 && likes_to_views > mean + sd * -3.0) color = "#ff2727"
    if (likes_to_views < mean + sd * -3.0) color = "#ff1414"
    
    Array.from(document.body.querySelectorAll("yt-formatted-string")).filter(a => a.textContent.match(/Dislike/)).reverse()[0].innerHTML = `Dislike <span>${likes_to_views}</span>`
    
    Array.from(document.body.querySelectorAll("yt-formatted-string")).filter(a => a.textContent.match(/Dislike/)).reverse()[0].querySelector("span").style.color = color;
}

main(); 


// 
// YT URL change monitor 
// 

var youtubeUrlPrevious = document.location.href;
var youtubeUrl = setInterval(function () {
    if (document.location.href !== youtubeUrlPrevious)
    {
        // since youtube does not update page state when the video changes in-youtube, 
        // runs when YT changed the URL (the point: but did not reload the page)
        main()
        // console.log("hoge.");
        // 
        youtubeUrlPrevious = document.location.href;
    }
}, 1000) // monitors URL by 1000ms 

