import type { ReactNode } from 'react';
import type { CarState, Intent } from '../types';
import { COLOR_LABEL } from '../state/car';
import { Defs } from './Defs';
import { CabinBase } from './CabinBase';
import { Ambient } from './Ambient';
import { Cluster } from './Cluster';
import { ClimatePanel } from './ClimatePanel';
import { VentModule } from './VentModule';
import { Console } from './Console';
import { Stalks, Wheel } from './Wheel';
import { Door, DriverSwitches, MirrorButtons, Seat } from './Fittings';
import { Pedals } from './Pedals';

interface Props {
  car: CarState;
  onIntent: (i: Intent) => void;
  onMic: () => void;
  /** Rendered between the dashboard and the steering wheel. */
  airflow: ReactNode;
  screen: ReactNode;
}

/** The fully drawn cockpit, stacked back to front like the real cabin. */
export function DrawnCabin({ car, onIntent, onMic, airflow, screen }: Props) {
  const amb = car.ambient;
  const ambColor = amb.on ? COLOR_LABEL[amb.color].css : '#000000';
  const ambLevel = amb.on && car.ignition !== 'off' ? Math.min(1, amb.brightness) : 0;

  return (
    <>
      <Defs />
      <CabinBase />
      <Ambient color={ambColor} level={ambLevel} party={amb.on && amb.party} />
      <Door car={car} onIntent={onIntent} />
      <MirrorButtons car={car} onIntent={onIntent} />
      <VentModule car={car} onIntent={onIntent} />
      <ClimatePanel car={car} onIntent={onIntent} />
      <Console car={car} onIntent={onIntent} />
      <DriverSwitches car={car} onIntent={onIntent} />
      <Pedals tint={amb.on ? ambColor : '#000000'} />
      <Cluster car={car} />
      {airflow}
      {screen}
      <Stalks car={car} onIntent={onIntent} />
      <Wheel car={car} onIntent={onIntent} onMic={onMic} />
      <Seat level={car.seats.passenger} />
      <div className={`cabin-light ${car.cabinLight ? 'on' : ''}`} />
      <div className="vignette" />
    </>
  );
}
