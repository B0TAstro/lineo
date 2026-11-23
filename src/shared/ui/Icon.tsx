import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import { colors } from './theme';
import Back from '../../../assets/icons/back.svg';
import Bluetooth from '../../../assets/icons/bluetooth.svg';
import Calibrate from '../../../assets/icons/calibrate.svg';
import CameraSwitch from '../../../assets/icons/camera-switch.svg';
import Camera from '../../../assets/icons/camera.svg';
import Check from '../../../assets/icons/check.svg';
import ChevronLeft from '../../../assets/icons/chevron-left.svg';
import ChevronRight from '../../../assets/icons/chevron-right.svg';
import Close from '../../../assets/icons/close.svg';
import Exit from '../../../assets/icons/exit.svg';
import Forward from '../../../assets/icons/forward.svg';
import FrameBack from '../../../assets/icons/frame-back.svg';
import FrameNext from '../../../assets/icons/frame-next.svg';
import Fullscreen from '../../../assets/icons/fullscreen.svg';
import Info from '../../../assets/icons/info.svg';
import MicOff from '../../../assets/icons/mic-off.svg';
import Mic from '../../../assets/icons/mic.svg';
import Minus from '../../../assets/icons/minus.svg';
import PanelClose from '../../../assets/icons/panel-close.svg';
import PanelOpen from '../../../assets/icons/panel-open.svg';
import Panel from '../../../assets/icons/panel.svg';
import Pause from '../../../assets/icons/pause.svg';
import Play from '../../../assets/icons/play.svg';
import Plus from '../../../assets/icons/plus.svg';
import Qr from '../../../assets/icons/qr.svg';
import Rewind from '../../../assets/icons/rewind.svg';
import Settings from '../../../assets/icons/settings.svg';
import Sparkle from '../../../assets/icons/sparkle.svg';
import Speed from '../../../assets/icons/speed.svg';
import Volume from '../../../assets/icons/volume.svg';
import Wifi from '../../../assets/icons/wifi.svg';

const ICONS = {
  back: Back,
  bluetooth: Bluetooth,
  calibrate: Calibrate,
  camera: Camera,
  cameraSwitch: CameraSwitch,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  close: Close,
  exit: Exit,
  forward: Forward,
  frameBack: FrameBack,
  frameNext: FrameNext,
  fullscreen: Fullscreen,
  info: Info,
  mic: Mic,
  micOff: MicOff,
  minus: Minus,
  panel: Panel,
  panelClose: PanelClose,
  panelOpen: PanelOpen,
  pause: Pause,
  play: Play,
  plus: Plus,
  qr: Qr,
  rewind: Rewind,
  settings: Settings,
  sparkle: Sparkle,
  speed: Speed,
  volume: Volume,
  wifi: Wifi,
} satisfies Record<string, FC<SvgProps>>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const Svg = ICONS[name];
  return <Svg width={size} height={size} color={color} />;
}
