use std::error::Error;
use tracing_subscriber::EnvFilter;

const DEFAULT_FILTER: &str = "info";

pub fn init_tracing() -> Result<(), Box<dyn Error + Send + Sync>> {
    let filter = tracing_filter(std::env::var("RUST_LOG").ok().as_deref())
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidInput, error))?;

    tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .with_current_span(false)
        .with_span_list(false)
        .with_target(true)
        .try_init()
        .map_err(Into::into)
}

fn tracing_filter(value: Option<&str>) -> Result<EnvFilter, String> {
    let directive = value.unwrap_or(DEFAULT_FILTER);
    EnvFilter::try_new(directive).map_err(|error| format!("invalid RUST_LOG `{directive}`: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_filter_is_valid() {
        assert!(tracing_filter(None).is_ok());
    }

    #[test]
    fn explicit_filter_accepts_targets_and_levels() {
        assert!(tracing_filter(Some("radome_server=debug,tokio=warn")).is_ok());
    }

    #[test]
    fn invalid_filter_is_rejected_before_server_startup() {
        assert!(tracing_filter(Some("radome_server=verbose")).is_err());
    }
}
