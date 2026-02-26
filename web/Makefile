wasm:
	wasm-pack build --target web

dev: wasm
	pnpm install
	pnpm run dev -- --host

build: wasm
	pnpm install
	pnpm run build
