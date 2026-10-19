import { Body, Card, Heading, Notice, Screen } from './ui';
export function PlannedScreen({ title, description, phase }: { title: string; description: string; phase: string }) {
  return <Screen><Heading title={title} /><Notice>Planned · {phase}</Notice>
    <Card><Body>{description}</Body><Body>This feature is not implemented yet. There is no sample planning data.</Body></Card></Screen>;
}
