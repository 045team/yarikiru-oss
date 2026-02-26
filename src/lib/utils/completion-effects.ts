import confetti from "canvas-confetti";

/**
 * 1. 豪華な花火エフェクト（中目標：目標完了時）
 */
export const fireGoalEffect = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }; // 確実に前面に出す

    const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
            ...defaults,
            particleCount,
            origin: { x: Math.random() * 0.5, y: Math.random() - 0.2 },
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: Math.random() * 0.5 + 0.5, y: Math.random() - 0.2 },
        });
    }, 250);
};

/**
 * 2. ささやかなPopエフェクト（小タスク：アクション、ワークログ完了時）
 * @param event クリックイベント等から座標を取得して、画面のその位置で発火させる
 */
export const fireTaskEffect = (event?: React.MouseEvent | MouseEvent | { clientX: number, clientY: number }) => {
    // デフォルトは画面中央やや下
    let x = 0.5;
    let y = 0.8;

    if (event && 'clientX' in event) {
        x = event.clientX / window.innerWidth;
        y = event.clientY / window.innerHeight;
    }

    confetti({
        particleCount: 30,
        spread: 40,
        origin: { x, y },
        colors: ["#22c55e", "#3b82f6", "#f59e0b"], // 落ち着いた色
        disableForReducedMotion: true,
        gravity: 0.5,
        scalar: 0.7, // 少し小さめ
        zIndex: 100,
    });
};

/**
 * 3. 上から降ってくる紙吹雪（大目標：プロジェクト完了時）
 */
export const fireProjectEffect = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#bb0000", "#ffffff", "#22c55e", "#3b82f6", "#f59e0b"],
            zIndex: 100,
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#bb0000", "#ffffff", "#22c55e", "#3b82f6", "#f59e0b"],
            zIndex: 100,
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
};
