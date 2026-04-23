const PI = Math.PI;
const DEG2RAD = PI / 180;

const mercator = {
    name: "Mercator",
    maxLatitude: 85,
    project(lonDeg, latDeg) {
        const lonRad = lonDeg * DEG2RAD;
        const latRad = Math.max(-85, Math.min(85, latDeg)) * DEG2RAD;
        return {
            x: lonRad,
            y: Math.log(Math.tan(PI / 4 + latRad / 2))
        };
    }
};

const gallPeters = {
    name: "Gall-Peters",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const cos45 = 0.7071067811865476;
        const lonRad = lonDeg * DEG2RAD;
        const latRad = latDeg * DEG2RAD;
        return {
            x: lonRad * cos45,
            y: Math.sin(latRad) / cos45
        };
    }
};

const equirectangular = {
    name: "Equirectangular",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        return {
            x: lonDeg * DEG2RAD,
            y: latDeg * DEG2RAD
        };
    }
};

const sinusoidal = {
    name: "Sinusoidal",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const lonRad = lonDeg * DEG2RAD;
        const latRad = latDeg * DEG2RAD;
        return {
            x: lonRad * Math.cos(latRad),
            y: latRad
        };
    }
};

const mollweide = {
    name: "Mollweide",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const lonRad = lonDeg * DEG2RAD;
        const latRad = latDeg * DEG2RAD;
        const theta = solveTheta(latRad);
        const sqrt2 = Math.SQRT2;
        return {
            x: (2 * sqrt2 / PI) * lonRad * Math.cos(theta),
            y: sqrt2 * Math.sin(theta)
        };
    }
};

function solveTheta(latRad) {
    if (Math.abs(latRad) > PI / 2 - 1e-10) {
        return Math.sign(latRad) * PI / 2;
    }
    const target = PI * Math.sin(latRad);
    let theta = latRad;
    for (let i = 0; i < 20; i++) {
        const f = 2 * theta + Math.sin(2 * theta) - target;
        const fPrime = 2 + 2 * Math.cos(2 * theta);
        const delta = f / fPrime;
        theta -= delta;
        if (Math.abs(delta) < 1e-12) break;
    }
    return theta;
}

const robinsonTable = [
    [1.0000, 0.0000], [0.9986, 0.0620], [0.9954, 0.1240], [0.9900, 0.1860],
    [0.9822, 0.2480], [0.9730, 0.3100], [0.9600, 0.3720], [0.9427, 0.4340],
    [0.9216, 0.4958], [0.8962, 0.5571], [0.8679, 0.6176], [0.8350, 0.6769],
    [0.7986, 0.7346], [0.7597, 0.7903], [0.7186, 0.8435], [0.6732, 0.8936],
    [0.6213, 0.9394], [0.5722, 0.9761], [0.5322, 1.0000],
];

const robinson = {
    name: "Robinson",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const absLat = Math.min(Math.abs(latDeg), 90);
        const lonRad = lonDeg * DEG2RAD;
        const index = absLat / 5;
        const i0 = Math.floor(index);
        const i1 = Math.min(i0 + 1, robinsonTable.length - 1);
        const frac = index - i0;
        const pLen = robinsonTable[i0][0] + (robinsonTable[i1][0] - robinsonTable[i0][0]) * frac;
        const pDfe = robinsonTable[i0][1] + (robinsonTable[i1][1] - robinsonTable[i0][1]) * frac;
        return {
            x: 0.8487 * lonRad * pLen,
            y: 1.3523 * pDfe * Math.sign(latDeg)
        };
    }
};

const winkelTripel = {
    name: "Winkel Tripel",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const lonRad = lonDeg * DEG2RAD;
        const latRad = latDeg * DEG2RAD;
        const cosPhi1 = 2 / PI;

        const eqX = lonRad * cosPhi1;
        const eqY = latRad;

        const alpha = Math.acos(Math.cos(latRad) * Math.cos(lonRad / 2));
        let aitX, aitY;
        if (Math.abs(alpha) < 1e-10) {
            aitX = 0;
            aitY = 0;
        } else {
            const sincAlpha = Math.sin(alpha) / alpha;
            aitX = 2 * Math.cos(latRad) * Math.sin(lonRad / 2) / sincAlpha;
            aitY = Math.sin(latRad) / sincAlpha;
        }
        return {
            x: (eqX + aitX) / 2,
            y: (eqY + aitY) / 2
        };
    }
};

const orthographic = {
    name: "Orthographic",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const centerLonRad = 0;
        const centerLatRad = 20 * DEG2RAD;
        const lonRad = lonDeg * DEG2RAD;
        const latRad = latDeg * DEG2RAD;
        const dLon = lonRad - centerLonRad;

        const cosC = Math.sin(centerLatRad) * Math.sin(latRad)
            + Math.cos(centerLatRad) * Math.cos(latRad) * Math.cos(dLon);

        const rawX = Math.cos(latRad) * Math.sin(dLon);
        const rawY = Math.cos(centerLatRad) * Math.sin(latRad)
            - Math.sin(centerLatRad) * Math.cos(latRad) * Math.cos(dLon);

        if (cosC < 0) {
            const len = Math.sqrt(rawX * rawX + rawY * rawY);
            if (len < 1e-10) return { x: 0, y: 0 };
            return { x: rawX / len, y: rawY / len };
        }
        return { x: rawX, y: rawY };
    }
};

const stereographic = {
    name: "Stereographic",
    maxLatitude: 90,
    project(lonDeg, latDeg) {
        const centerLonRad = 0;
        const centerLatRad = 20 * DEG2RAD;
        const lonRad = lonDeg * DEG2RAD;
        const latRad = latDeg * DEG2RAD;
        const dLon = lonRad - centerLonRad;

        const cosC = Math.sin(centerLatRad) * Math.sin(latRad)
            + Math.cos(centerLatRad) * Math.cos(latRad) * Math.cos(dLon);

        const k = 2 / (1 + Math.max(cosC, -0.9));
        return {
            x: k * Math.cos(latRad) * Math.sin(dLon),
            y: k * (Math.cos(centerLatRad) * Math.sin(latRad)
                - Math.sin(centerLatRad) * Math.cos(latRad) * Math.cos(dLon))
        };
    }
};

const allProjections = [
    mercator, gallPeters, equirectangular, sinusoidal,
    mollweide, robinson, winkelTripel, orthographic, stereographic
];

function compositeProject(projA, projB, weightB, lonDeg, latDeg) {
    const a = projA.project(lonDeg, latDeg);
    const b = projB.project(lonDeg, latDeg);
    const wA = 1 - weightB;
    return {
        x: wA * a.x + weightB * b.x,
        y: wA * a.y + weightB * b.y
    };
}

function computeBounds(projectFn, maxLat) {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    function sample(lon, lat) {
        const p = projectFn(lon, lat);
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
        if (p.y < yMin) yMin = p.y;
        if (p.y > yMax) yMax = p.y;
    }

    for (let lon = -180; lon <= 180; lon++) {
        sample(lon, -maxLat);
        sample(lon, 0);
        sample(lon, maxLat);
    }
    for (let lat = -maxLat; lat <= maxLat; lat++) {
        sample(-180, lat);
        sample(0, lat);
        sample(180, lat);
    }

    const mx = (xMax - xMin) * 0.02;
    const my = (yMax - yMin) * 0.02;
    return { xMin: xMin - mx, xMax: xMax + mx, yMin: yMin - my, yMax: yMax + my };
}
