let video = document.getElementById('video');
let canvasElement = document.getElementById('canvas');
let canvas = canvasElement.getContext('2d');
let streaming = false;
let grayFilter = document.getElementById('grayFilter');
let cannyFilter = document.getElementById('cannyFilter');
let decimateFilter = document.getElementById('decimateFilter');
let adaptiveThresholdFilter = document.getElementById('adaptiveThresholdFilter');
let segmentationFilter = document.getElementById('segmentationFilter');
let quadDetectionFilter = document.getElementById('quadDetectionFilter');
let src = null;
let dst = null;
let cap = null;

function startVideo() {
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
    })
    .catch(function(err) {
        console.log("An error occurred: " + err);
    });

    video.addEventListener('canplay', function(ev){
        if (!streaming) {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            streaming = true;
            cap = new cv.VideoCapture(video);
            src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
            dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        }
    }, false);
}

function onOpenCvReady() {
    document.getElementById('startbutton').disabled = false;
    startVideo();
}

function onOpenCvFail() {
    alert('Oops! OpenCV.js failed to load.');
}

document.getElementById('startbutton').addEventListener('click', function(ev){
    if(src && dst) {
        cap.read(src);
        if(grayFilter.checked) {
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        }
        if(cannyFilter.checked) {
            cv.Canny(src, dst, 50, 100);
        }
        if(decimateFilter.checked) {
            let decimated = new cv.Mat();
            cv.pyrDown(src, decimated, new cv.Size(src.cols/2, src.rows/2), cv.BORDER_DEFAULT);
            cv.pyrUp(decimated, dst, new cv.Size(src.cols, src.rows), cv.BORDER_DEFAULT);
            decimated.delete();
        }
        if(adaptiveThresholdFilter.checked) {
            cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
            cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
        }
        if(segmentationFilter.checked) {
            cap.read(src);
            cv.cvtColor(src, src, cv.COLOR_RGBA2BGR);
            let mask = new cv.Mat();
            let bgdModel = new cv.Mat();
            let fgdModel = new cv.Mat();
            let rect = new cv.Rect(1, 1, src.cols - 2, src.rows - 2);
            cv.grabCut(src, mask, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);
            let prMask = mask.clone();
            cv.threshold(prMask, prMask, cv.GC_PR_FGD - 0.5, 255, cv.THRESH_BINARY);
            let foreground = cv.Mat.ones(src.size(), cv.CV_8U);
            src.copyTo(foreground, prMask);
            cv.cvtColor(foreground, dst, cv.COLOR_BGR2RGBA);
            mask.delete(); bgdModel.delete(); fgdModel.delete(); prMask.delete(); foreground.delete();
        }
        if(quadDetectionFilter.checked) {
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let perimeter = cv.arcLength(cnt, true);
                let approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.02 * perimeter, true);
                if (approx.rows == 4) {
                    let cntVec = cv.matFromArray(approx, 4, cv.CV_32SC2);
                    let rotatedRect = cv.minAreaRect(cntVec);
                    let vertices = cv.RotatedRect.points(rotatedRect);
                    let ratio = cv.norm(vertices[0], vertices[1]) / cv.norm(vertices[1], vertices[2]);
                    if (ratio >= 0.9 && ratio <= 1.1) {
                        // It's a square.
                        // Code to annotate the image with 'Square'.
                    } else {
                        // It's a rectangle.
                        // Code to annotate the image with 'Rectangle'.
                    }
                }
                approx.delete();
            }
            contours.delete(); hierarchy.delete();
        }
        cv.imshow('canvas', dst);
    }
    ev.preventDefault();
}, false);
