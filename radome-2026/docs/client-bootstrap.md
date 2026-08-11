# Bootstrap dynamique d'un client RADOME

Ce document fixe le contrat minimal permettant à un client de devenir opérationnel sans embarquer le catalogue des commandes du serveur.

## Séquence nominale

1. **Hello**
   - le client envoie `hello` avec son `client_id` ;
   - le serveur retourne un `hello` corrélé et attribue un `session_id`.

2. **Discovery**
   - le client envoie `discovery_request` dans la session ;
   - le serveur retourne `discovery_result` avec les capabilities disponibles et le catalogue courant des commandes ;
   - le client peut alors décider dynamiquement quelles capabilities il sait exploiter.

3. **Capability announce**
   - le client envoie `capability_announce` avec son rôle et les capabilities qu'il choisit d'annoncer ;
   - le serveur enregistre le client et confirme l'annonce.

4. **State synchronization**
   - le client envoie `state_snapshot_request` ;
   - le serveur retourne `state_snapshot` avec l'état courant des domaines exposés ;
   - ce snapshot constitue la base locale à partir de laquelle le client applique ensuite les événements incrémentaux.

5. **Operational**
   - le client peut émettre les commandes découvertes pour lesquelles il a annoncé la capability requise ;
   - les commandes réussies produisent un `command_result` puis un événement décrivant l'état résultant ;
   - un nouveau snapshot peut être demandé à tout moment pour resynchronisation.

## Invariants

- Toute requête après `hello` porte le `session_id` attribué par le serveur.
- Discovery et snapshot ne nécessitent pas que le client connaisse à l'avance le catalogue serveur.
- Une commande nécessite un `capability_announce` préalable et la capability requise par sa définition.
- Le catalogue retourné par discovery provient de la même source de vérité que l'exécution des commandes.
- Le snapshot reflète le même état d'actionneur que les événements produits après une commande.
- Le client ne doit pas déduire une capability à partir du nom d'une commande : il utilise `required_capability` fourni par discovery.

## Exemple de bootstrap

```text
client                                      server
  |                                           |
  | hello(client_id)                          |
  |------------------------------------------>|
  | hello(session_id)                         |
  |<------------------------------------------|
  |                                           |
  | discovery_request                         |
  |------------------------------------------>|
  | discovery_result(capabilities, commands)  |
  |<------------------------------------------|
  |                                           |
  | capability_announce(role, selected caps)  |
  |------------------------------------------>|
  | capability_announce(accepted)             |
  |<------------------------------------------|
  |                                           |
  | state_snapshot_request                    |
  |------------------------------------------>|
  | state_snapshot                            |
  |<------------------------------------------|
  |                                           |
  |              OPERATIONAL                  |
```

Le bootstrap est volontairement composé des primitives protocolaires existantes plutôt que d'introduire un message monolithique `bootstrap`. Cela conserve des étapes observables, corrélables et réutilisables indépendamment.