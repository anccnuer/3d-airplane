import { clamp, type InputCommand } from '@classroom-arena/shared';

const CONTROL_KEYS = new Set(['KeyW', 'KeyS', 'KeyQ', 'KeyE']);
const MOUSE_SENSITIVITY = 0.014;
const STICK_RECENTER_SECONDS = 0.18;
const RESPONSE_EXPONENT = 1.25;
const STICK_ZERO_THRESHOLD = 0.002;

function shapeAxis(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude < STICK_ZERO_THRESHOLD) return 0;
  return Math.sign(value) * Math.pow(magnitude, RESPONSE_EXPONENT);
}

function decayStick(value: number, dt: number): number {
  return value * Math.exp(-clamp(dt, 0, 0.1) / STICK_RECENTER_SECONDS);
}

export class InputSystem {
  private readonly keys = new Set<string>();
  private stickYaw = 0;
  private stickPitch = 0;
  private pendingYaw = 0;
  private pendingPitch = 0;
  private mouseDown = false;
  private sequence = 0;
  private locked = false;

  constructor(private readonly element: HTMLElement, private readonly isPointerLocked: () => boolean = () => this.locked) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.element.addEventListener('mousedown', this.handleMouseDown);
  }

  resetMotion(): void {
    this.stickYaw = 0;
    this.stickPitch = 0;
    this.pendingYaw = 0;
    this.pendingPitch = 0;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (CONTROL_KEYS.has(event.code)) event.preventDefault();
    this.keys.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private handleBlur = (): void => {
    this.keys.clear();
    this.mouseDown = false;
    this.resetMotion();
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isPointerLocked()) return;
    this.pendingYaw += event.movementX * MOUSE_SENSITIVITY;
    this.pendingPitch -= event.movementY * MOUSE_SENSITIVITY;
  };

  private handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    this.mouseDown = true;
    if (!this.locked) {
      const request = this.element.requestPointerLock();
      if (request && typeof request.catch === 'function') request.catch(console.error);
    }
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) this.mouseDown = false;
  };

  private handlePointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.element;
    if (!this.locked) {
      this.mouseDown = false;
      this.resetMotion();
    }
  };

  sample(tick: number, dt: number): InputCommand {
    this.stickYaw = clamp(this.isPointerLocked() ? decayStick(this.stickYaw, dt) + this.pendingYaw : 0, -1, 1);
    this.stickPitch = clamp(this.isPointerLocked() ? decayStick(this.stickPitch, dt) + this.pendingPitch : 0, -1, 1);
    this.pendingYaw = 0;
    this.pendingPitch = 0;

    let roll = 0;
    let throttle = 0;

    if (this.keys.has('KeyQ')) roll -= 1;
    if (this.keys.has('KeyE')) roll += 1;
    if (this.keys.has('KeyW')) throttle += 1;
    if (this.keys.has('KeyS')) throttle -= 1;

    this.sequence += 1;
    return {
      type: 'input',
      seq: this.sequence,
      tick,
      throttle,
      pitch: shapeAxis(this.stickPitch),
      yaw: shapeAxis(this.stickYaw),
      roll,
      fire: this.mouseDown
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    if (document.pointerLockElement === this.element) document.exitPointerLock();
  }
}
