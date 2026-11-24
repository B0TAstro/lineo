# Architecture

Ce qui tourne sur chaque téléphone en **v0.4**, et ce qui circule entre eux. En pointillé : prévu, pas encore construit. Un téléphone seul est un hôte sans invité : même code de 1 à N téléphones. Chaque fonctionnalité range sa logique dans `logic/` et ses briques natives dans `native/` ; le détail des dossiers et des règles est dans [`CLAUDE.md`](../CLAUDE.md#architecture).

Image pour les slides : [`images/architecture.png`](images/architecture.png) (`npm run docs:images` la regénère depuis ce fichier).

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Helvetica, Arial','fontSize':'15px','primaryColor':'#FFFFFF','primaryTextColor':'#0A0A0A','primaryBorderColor':'#161816','lineColor':'#0A0A0A','clusterBkg':'#F5F6F4','clusterBorder':'#161816'}}}%%
flowchart LR
  subgraph A["📱 Téléphone HÔTE · crée la session · suffit seul pour jouer"]
    direction TB
    A_UI["<b>Écrans</b><br/>Accueil · Créer · Rejoindre · Match · Replay"]
    A_F["<b>Fonctionnalités</b> · features/<br/>Match · Session · Enregistrement · Replay · Pics sonores · Voix · Score"]
    subgraph A_CORE["Logique · TypeScript pur, testé sans téléphone · logic/ et sports/tennis"]
      direction LR
      A_S["Score du tennis<br/>machine à états<br/><i>sports/tennis</i>"]
      A_J["Journal<br/>d'événements<br/><i>référence</i><br/>le score en est dérivé"]
      A_P["Protocole<br/>l'hôte valide et numérote<br/>🔒 messages chiffrés<br/>avec la clé du QR"]
      A_C["File des clips<br/>3 points : en cours<br/>+ 2 précédents"]
      A_VO["Voix<br/>texte → score"]
      A_SO["Son<br/>pics sonores"]
      A_V["Vision<br/>court, balle,<br/>rebond, confiance<br/><i>v0.5+</i>"]
    end
    subgraph A_NAT["Briques natives · native/, derrière une interface"]
      direction LR
      A_CAM["Caméra + son<br/>VisionCamera"]
      A_MIC["Voix<br/>Vosk FR"]
      A_ENV["Niveau sonore<br/>module sound-levels"]
      A_LINK["Liaison<br/>BLE (sans radio si refusé)"]
      A_CV["Pixels<br/>OpenCV <i>v0.5</i>"]
    end
    A_DISK[("Stockage local<br/>clips .mp4<br/>supprimés en fin de match")]
    A_UI --> A_F --> A_CORE
    A_F --> A_NAT
    A_CAM --> A_DISK
  end

  subgraph B["📱 0 à N téléphones INVITÉS · autres points de vue (facultatifs)"]
    direction TB
    B_UI["<b>Écrans</b><br/>les mêmes"]
    B_F["<b>Fonctionnalités</b><br/>les mêmes"]
    B_CORE["Logique<br/>copie du journal<br/>envoie ses intentions à l'hôte<br/>(tap, annonce entendue, VAR)"]
    B_NAT["Caméra · Voix · Liaison"]
    B_DISK[("Stockage local<br/>ses propres clips")]
    B_UI --> B_F --> B_CORE
    B_F --> B_NAT --> B_DISK
  end

  A_LINK <== "Bluetooth BLE · 🔒 chiffré<br/>intentions → hôte<br/>événements numérotés → tous" ==> B_NAT
  A_LINK <-. "Wi-Fi local · secours automatique<br/><i>v0.6</i>" .-> B_NAT

  NOTE["<b>1 téléphone</b> = hôte sans invité, même code.<br/><b>N téléphones</b> = étoile autour de l'hôte,<br/>qui numérote et diffuse les événements.<br/>🔒 Clé de session dans le QR code seulement.<br/>Pas de vidéo dans le protocole, aucun serveur."]
  B ~~~ NOTE

  classDef core fill:#EEF0EC,stroke:#161816,stroke-width:2px,color:#0A0A0A
  classDef nat fill:#F6FCDC,stroke:#0A0A0A,stroke-width:2px,color:#0A0A0A
  classDef later fill:#FFFFFF,stroke:#9AA39E,stroke-width:2px,stroke-dasharray:5 4,color:#6B716D
  classDef ui fill:#0A0A0A,stroke:#0A0A0A,color:#FFFFFF
  classDef note fill:#FFFFFF,stroke:#0A0A0A,stroke-dasharray:4 3,color:#0A0A0A
  class A_S,A_J,A_P,A_C,A_VO,A_SO,B_CORE core
  class A_CAM,A_MIC,A_ENV,A_LINK,B_NAT nat
  class A_V,A_CV later
  class A_UI,B_UI ui
  class NOTE note
```
