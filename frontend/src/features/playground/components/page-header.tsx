type PlaygroundPageHeaderProps = {
  title: string;
  description: string;
};

export function PlaygroundPageHeader({
  title,
  description,
}: PlaygroundPageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
