export const getSectionAutomationWarnings = ({
	autoPodcast,
	autoIllustration,
	hasPodcastEngine,
	hasImageEngine,
}: {
	autoPodcast: boolean;
	autoIllustration: boolean;
	hasPodcastEngine: boolean;
	hasImageEngine: boolean;
}) => {
	return {
		missingPodcastEngine: autoPodcast && !hasPodcastEngine,
		missingIllustrationEngine: autoIllustration && !hasImageEngine,
	};
};
