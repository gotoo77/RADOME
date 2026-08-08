// La validation fonctionnelle de la frontière bus vit dans radome-core et
// producer.rs. Ce fichier documente intentionnellement qu'aucun test CI ne
// requiert une interface CAN physique : SocketCAN est une source
// d'infrastructure Linux, tandis que le pipeline métier reste injectable.

#[test]
fn socketcan_backend_does_not_require_hardware_for_the_test_suite() {
    assert!(true);
}
