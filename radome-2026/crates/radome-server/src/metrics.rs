use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;
use std::time::Duration;

#[derive(Debug, Default)]
pub struct ServerMetrics {
    active_clients: AtomicU64,
    client_registrations_total: AtomicU64,
    commands_total: AtomicU64,
    commands_succeeded_total: AtomicU64,
    commands_failed_total: AtomicU64,
    telemetry_events_total: AtomicU64,
    telemetry_errors_total: AtomicU64,
    socketcan_reconnects_total: AtomicU64,
    outbound_backpressure_drops_total: AtomicU64,
    connection_limit_rejections_total: AtomicU64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MetricsSnapshot {
    pub active_clients: u64,
    pub client_registrations_total: u64,
    pub commands_total: u64,
    pub commands_succeeded_total: u64,
    pub commands_failed_total: u64,
    pub telemetry_events_total: u64,
    pub telemetry_errors_total: u64,
    pub socketcan_reconnects_total: u64,
    pub outbound_backpressure_drops_total: u64,
    pub connection_limit_rejections_total: u64,
}

static PROCESS_METRICS: OnceLock<ServerMetrics> = OnceLock::new();

pub fn process_metrics() -> &'static ServerMetrics {
    PROCESS_METRICS.get_or_init(ServerMetrics::default)
}

impl ServerMetrics {
    pub fn record_client_registration(&self, active_clients: usize) {
        self.client_registrations_total.fetch_add(1, Ordering::Relaxed);
        self.set_active_clients(active_clients);
    }

    pub fn set_active_clients(&self, active_clients: usize) {
        self.active_clients
            .store(active_clients as u64, Ordering::Relaxed);
    }

    pub fn record_command_attempt(&self) {
        self.commands_total.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_command_success(&self) {
        self.commands_succeeded_total.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_command_failure(&self) {
        self.commands_failed_total.fetch_add(1, Ordering::Relaxed);
    }

    pub fn add_telemetry_events(&self, count: usize) {
        self.telemetry_events_total
            .fetch_add(count as u64, Ordering::Relaxed);
    }

    pub fn record_telemetry_error(&self) {
        self.telemetry_errors_total.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_socketcan_reconnect(&self) {
        self.socketcan_reconnects_total
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_outbound_backpressure_drop(&self) {
        self.outbound_backpressure_drops_total
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_connection_limit_rejection(&self) {
        self.connection_limit_rejections_total
            .fetch_add(1, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        MetricsSnapshot {
            active_clients: self.active_clients.load(Ordering::Relaxed),
            client_registrations_total: self.client_registrations_total.load(Ordering::Relaxed),
            commands_total: self.commands_total.load(Ordering::Relaxed),
            commands_succeeded_total: self.commands_succeeded_total.load(Ordering::Relaxed),
            commands_failed_total: self.commands_failed_total.load(Ordering::Relaxed),
            telemetry_events_total: self.telemetry_events_total.load(Ordering::Relaxed),
            telemetry_errors_total: self.telemetry_errors_total.load(Ordering::Relaxed),
            socketcan_reconnects_total: self.socketcan_reconnects_total.load(Ordering::Relaxed),
            outbound_backpressure_drops_total: self
                .outbound_backpressure_drops_total
                .load(Ordering::Relaxed),
            connection_limit_rejections_total: self
                .connection_limit_rejections_total
                .load(Ordering::Relaxed),
        }
    }
}

pub fn emit_process_metrics() {
    let snapshot = process_metrics().snapshot();
    tracing::info!(
        active_clients = snapshot.active_clients,
        client_registrations_total = snapshot.client_registrations_total,
        commands_total = snapshot.commands_total,
        commands_succeeded_total = snapshot.commands_succeeded_total,
        commands_failed_total = snapshot.commands_failed_total,
        telemetry_events_total = snapshot.telemetry_events_total,
        telemetry_errors_total = snapshot.telemetry_errors_total,
        socketcan_reconnects_total = snapshot.socketcan_reconnects_total,
        outbound_backpressure_drops_total = snapshot.outbound_backpressure_drops_total,
        connection_limit_rejections_total = snapshot.connection_limit_rejections_total,
        "metrics_snapshot"
    );
}

pub fn spawn_metrics_reporter(interval: Duration) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(interval);
        ticker.tick().await;
        loop {
            ticker.tick().await;
            emit_process_metrics();
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_tracks_gauges_and_monotonic_counters() {
        let metrics = ServerMetrics::default();
        metrics.record_client_registration(1);
        metrics.record_client_registration(2);
        metrics.set_active_clients(1);
        metrics.record_command_attempt();
        metrics.record_command_success();
        metrics.record_command_attempt();
        metrics.record_command_failure();
        metrics.add_telemetry_events(3);
        metrics.record_telemetry_error();
        metrics.record_socketcan_reconnect();
        metrics.record_outbound_backpressure_drop();
        metrics.record_connection_limit_rejection();

        assert_eq!(
            metrics.snapshot(),
            MetricsSnapshot {
                active_clients: 1,
                client_registrations_total: 2,
                commands_total: 2,
                commands_succeeded_total: 1,
                commands_failed_total: 1,
                telemetry_events_total: 3,
                telemetry_errors_total: 1,
                socketcan_reconnects_total: 1,
                outbound_backpressure_drops_total: 1,
                connection_limit_rejections_total: 1,
            }
        );
    }
}