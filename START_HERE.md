# Loss Visualizer — 開始ガイド

> **この文書は初期のMVP立ち上げ用ガイドだった。MVPは完成・公開済みのため、内容を現状に合わせて縮小した。**
> 実際の運用ルールは`CLAUDE.md`、改善フェーズの方針は`docs/improvement-plan.md`にある。

## 現状

- Web版MVPは第1〜11ループで完成し、2026-08-31にVercelへ公開済み（https://loss-visualizer.vercel.app ）。
- 技術構成：React 19 + Vite 8 + Tailwind 4 + React Router 7。データはlocalStorageにのみ保存する。
- 現在は改善フェーズ。Loop 12から`docs/improvement-plan.md`の順で進める。

## 読む順

1. `CLAUDE.md` — 運用ルール（正本の優先順位、モデルの使い分け、自立性の範囲、Loop運用）
2. `docs/improvement-plan.md` — 改善フェーズの方針とLoop順序
3. `PRODUCT_SPEC.md` — MVPで確定した体験と機能

1と2は`CLAUDE.md`から自動で読み込まれる。`README.md`・`MVP-PLAN.md`・このファイルは必要なときだけ読む。

## 人間が判断すること

Claude Codeは実装・テスト・技術的な判断を担当する。次はユーザーが判断する。

- UXが本当に自然か、入力が面倒でないか
- 問いかけや結果表示が説教臭くないか
- 比較表示がユーザーにとって価値を感じられるか
- 実際の買い物前にスマートフォンのブラウザで使いたいと思えるか
- Edge・Firefox・iOS Safari・実機iPhoneでの表示確認（この環境ではChromeしか操作できない）
