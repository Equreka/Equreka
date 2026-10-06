import { usePathProgress } from '@equreka/core';
import { localizedName, pickLocalized } from '@equreka/core/i18n';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { entryHref } from '../../entities/content/routes';
import { type LocalizedRichText, pickSegments } from '../../entities/content/text';
import type { PresentationPath, PresentationPathStep } from '../../entities/content/types';
import { getPresentation } from '../../shared/content/artifact';
import { RichText } from '../../shared/math/math-view';
import { useLocale, useStorage, useT, useTheme } from '../../shared/providers/equreka-provider';
import { Button } from '../../shared/ui/button';
import { Badge, Card, Row } from '../../shared/ui/card';
import { HStack, Screen, VStack } from '../../shared/ui/screen';
import { AppText, Lead, Muted, SectionTitle, Title } from '../../shared/ui/text';

export interface PathScreenProps {
	slug: string;
}

function Prose({ text }: { text: LocalizedRichText | undefined }) {
	const t = useT();
	if (text === undefined) return null;
	return (
		<VStack gap={1}>
			<RichText segments={text.segments} />
			{text.untranslated ? <Muted>{t('badge.untranslated')}</Muted> : null}
		</VStack>
	);
}

interface StepCardProps {
	step: PresentationPathStep;
	index: number;
	total: number;
	done: boolean;
	onToggle: () => void;
}

/**
 * One step: a check toggle bound to the shared progress record, the kind
 * badge, and the kind-specific body — entry steps link to their target,
 * check steps hide the answer until revealed.
 */
function StepCard({ step, index, total, done, onToggle }: StepCardProps) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const [revealed, setRevealed] = useState(false);
	return (
		<Card>
			<HStack style={styles.between}>
				<HStack gap={1.5}>
					<Muted>{t('path.stepOf', { n: index + 1, total })}</Muted>
					<Badge label={t(`path.kind.${step.kind}`)} />
				</HStack>
				<Pressable
					accessibilityRole="checkbox"
					accessibilityState={{ checked: done }}
					accessibilityLabel={t(done ? 'path.markUndone' : 'path.markDone')}
					hitSlop={theme.space(2)}
					onPress={onToggle}
				>
					<Ionicons
						name={done ? 'checkmark-circle' : 'ellipse-outline'}
						size={28}
						color={done ? theme.color.accent : theme.color.inkMuted}
					/>
				</Pressable>
			</HStack>
			{step.kind === 'entry' ? (
				<VStack>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						<Row
							title={pickLocalized(step.target.name, locale).value}
							subtitle={step.target.symbolText}
							onPress={() => router.push(entryHref(step.ref.collection, step.ref.slug))}
							accessibilityLabel={t('path.openEntry')}
						/>
					</View>
					<Prose text={pickSegments(step.noteSegments, locale)} />
				</VStack>
			) : step.kind === 'prose' ? (
				<Prose text={pickSegments(step.bodySegments, locale)} />
			) : (
				<VStack>
					<AppText weight="600">{t('path.check')}</AppText>
					<Prose text={pickSegments(step.promptSegments, locale)} />
					<HStack>
						<Button
							label={t(revealed ? 'mobile.check.hide' : 'path.reveal')}
							onPress={() => setRevealed((value) => !value)}
						/>
					</HStack>
					{revealed ? <Prose text={pickSegments(step.answerSegments, locale)} /> : null}
				</VStack>
			)}
		</Card>
	);
}

function PathBody({ slug, path }: { slug: string; path: PresentationPath }) {
	const locale = useLocale();
	const t = useT();
	const theme = useTheme();
	const router = useRouter();
	const stepIds = path.steps.map((step) => step.id);
	const progress = usePathProgress(useStorage(), slug, stepIds);
	const total = stepIds.length;
	const complete = total > 0 && progress.done.size === total;
	const prerequisites = path.prerequisites
		.map((prerequisite) => {
			const target = getPresentation('paths')[prerequisite];
			return target === undefined
				? null
				: { slug: prerequisite, name: localizedName(target, locale) };
		})
		.filter((entry) => entry !== null);
	return (
		<Screen>
			<VStack>
				<Title>{localizedName(path, locale)}</Title>
				<HStack gap={1.5}>
					<Badge label={t(`level.${path.level}`)} color={theme.color.accent} />
					<Badge label={t('path.steps', { count: total })} />
					{path.estimatedMinutes === undefined ? null : (
						<Badge label={t('path.minutes', { count: path.estimatedMinutes })} />
					)}
				</HStack>
				<Prose text={pickSegments(path.descriptionSegments, locale)} />
			</VStack>
			<VStack gap={1}>
				<HStack style={styles.between}>
					<AppText
						size="sm"
						tone={complete ? 'accent' : 'muted'}
						weight={complete ? '600' : undefined}
					>
						{complete
							? t('path.completed')
							: t('path.progress', { done: progress.done.size, total })}
					</AppText>
					{progress.done.size > 0 ? (
						<Button label={t('path.reset')} variant="ghost" onPress={progress.reset} />
					) : null}
				</HStack>
				<View
					accessibilityRole="progressbar"
					accessibilityLabel={t('path.progressAria')}
					accessibilityValue={{ min: 0, max: total, now: progress.done.size }}
					style={[
						styles.track,
						{ backgroundColor: theme.color.border, borderRadius: theme.radius.sm },
					]}
				>
					<View
						style={[
							styles.fill,
							{
								width: `${progress.percent}%`,
								backgroundColor: theme.color.accent,
								borderRadius: theme.radius.sm,
							},
						]}
					/>
				</View>
			</VStack>
			{prerequisites.length === 0 ? null : (
				<VStack>
					<SectionTitle>{t('path.prerequisites')}</SectionTitle>
					<View style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
						{prerequisites.map((prerequisite) => (
							<Row
								key={prerequisite.slug}
								title={prerequisite.name}
								onPress={() => router.push(entryHref('paths', prerequisite.slug))}
							/>
						))}
					</View>
				</VStack>
			)}
			<VStack gap={3}>
				{path.steps.map((step, index) => (
					<StepCard
						key={step.id}
						step={step}
						index={index}
						total={total}
						done={progress.isDone(step.id)}
						onToggle={() => progress.toggleStep(step.id)}
					/>
				))}
			</VStack>
		</Screen>
	);
}

export function PathScreen({ slug }: PathScreenProps) {
	const t = useT();
	const path = getPresentation('paths')[slug];
	if (path === undefined) {
		return (
			<Screen>
				<Lead>{t('mobile.entry.notFound')}</Lead>
			</Screen>
		);
	}
	return <PathBody slug={slug} path={path} />;
}

const styles = StyleSheet.create({
	between: { justifyContent: 'space-between' },
	track: { height: 8, overflow: 'hidden' },
	fill: { height: '100%' },
});
