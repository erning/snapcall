use snapcall_core::estimate_equity as core_estimate_equity;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct EstimateResult {
    equities: Vec<f64>,
    mode: String,
    samples: usize,
}

#[wasm_bindgen]
impl EstimateResult {
    #[wasm_bindgen(getter)]
    pub fn equities(&self) -> Vec<f64> {
        self.equities.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn mode(&self) -> String {
        self.mode.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn samples(&self) -> usize {
        self.samples
    }
}

#[wasm_bindgen]
pub fn estimate_equity(
    board: &str,
    hero: &str,
    villains: Vec<String>,
    iterations: u32,
) -> Result<EstimateResult, JsError> {
    let v_refs: Vec<&str> = villains.iter().map(|s| s.as_str()).collect();
    let result = core_estimate_equity(board, hero, &v_refs, iterations as usize)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(EstimateResult {
        equities: result.equities,
        mode: format!("{:?}", result.mode),
        samples: result.samples,
    })
}
