/**
 * Resample points along a polyline at equidistant target intervals
 * to normalize sampling rate and eliminate hand jitter.
 */
export function resamplePoints(points, targetInterval = 12) {
    if (points.length <= 2)
        return points;
    const resampled = [points[0]];
    let accumulatedDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segmentLen = Math.hypot(dx, dy);
        if (segmentLen === 0)
            continue;
        let step = 0;
        while (accumulatedDist + (segmentLen - step) >= targetInterval) {
            const remainingNeeded = targetInterval - accumulatedDist;
            const t = (step + remainingNeeded) / segmentLen;
            const newPt = {
                x: p1.x + dx * t,
                y: p1.y + dy * t
            };
            resampled.push(newPt);
            step += remainingNeeded;
            accumulatedDist = 0;
        }
        accumulatedDist += segmentLen - step;
    }
    const lastOriginal = points[points.length - 1];
    const lastResampled = resampled[resampled.length - 1];
    if (Math.hypot(lastOriginal.x - lastResampled.x, lastOriginal.y - lastResampled.y) > 4) {
        resampled.push(lastOriginal);
    }
    return resampled;
}
/**
 * Catmull-Rom spline converter to generate continuous cubic Bezier path.
 */
export function generateSmoothBezierPath(points) {
    if (points.length < 2)
        return '';
    if (points.length === 2) {
        return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
    }
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    const tension = 0.25;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
}
/**
 * World <-> Screen coordinate projection helpers.
 */
export function screenToWorld(screenX, screenY, panX, panY, zoom) {
    return {
        x: (screenX - panX) / zoom,
        y: (screenY - panY) / zoom
    };
}
export function worldToScreen(worldX, worldY, panX, panY, zoom) {
    return {
        x: worldX * zoom + panX,
        y: worldY * zoom + panY
    };
}
