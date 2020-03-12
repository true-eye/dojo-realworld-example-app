import { create, tsx } from '@dojo/framework/core/vdom';
import { createICacheMiddleware } from '@dojo/framework/core/middleware/icache';
import FeedList from './FeedList';
import Tags from './Tags';
import { Banner } from './Banner';
import { FeedPagination } from './FeedPagination';
import { baseUrl } from '../config';
import { getHeaders } from '../utils';
import session from '../session';

interface HomeProperties {
	isAuthenticated: boolean;
	feedType: string;
	onFeedChange: (type: string) => void;
}

interface HomeState {
	articles: any;
	pageNumber: number;
	total: number;
}

const icache = createICacheMiddleware<HomeState>();

const factory = create({ icache, session })
	.properties<HomeProperties>()
	.key('feedType');

export const Home = factory(function Home({ properties, middleware: { icache, session } }) {
	const { isAuthenticated, feedType, onFeedChange } = properties();
	const isTag = ['feed', 'global'].indexOf(feedType) === -1;
	const total = icache.get('total');
	const pageNumber = icache.getOrSet('pageNumber', 0);
	const articles = icache.getOrSet('articles', async () => {
		const { feedType } = properties();
		const pageNumber = icache.getOrSet('pageNumber', 0);
		let url = `${baseUrl}/articles`;
		if (feedType === 'feed') {
			url = `${url}/feed?`;
		} else if (feedType === 'global') {
			url = `${url}/?`;
		} else {
			url = `${url}/?tag=${feedType}&`;
		}
		const response = await fetch(`${url}limit=10&offset=${pageNumber * 10}`, {
			headers: getHeaders(session.token())
		});
		const json = await response.json();
		icache.set('total', json.articlesCount);
		return json.articles || [];
	});

	return (
		<div classes={['home-page']}>
			<Banner />
			<div classes={['container', 'page']}>
				<div classes={['row']}>
					<div classes={['col-md-9']}>
						<div classes={['feed-toggle']}>
							<ul classes={['nav', 'nav-pills', 'outline-active']}>
								{isAuthenticated && (
									<li key="feeds" classes={['nav-item']}>
										<a
											href=""
											onclick={(event: MouseEvent) => {
												event.preventDefault();
												const { onFeedChange } = properties();
												onFeedChange('feed');
											}}
											classes={['nav-link', feedType === 'feed' && 'active']}
										>
											Your Feed
										</a>
									</li>
								)}

								<li key="global" classes={['nav-item']}>
									<a
										href=""
										onclick={(event: MouseEvent) => {
											event.preventDefault();
											const { onFeedChange } = properties();
											onFeedChange('global');
										}}
										classes={['nav-link', feedType === 'global' && 'active']}
									>
										Global Feed
									</a>
								</li>
								{isTag && (
									<li key="tags" classes={['nav-item']}>
										<a classes={['nav-link', 'active']}>{`#${feedType}`}</a>
									</li>
								)}
							</ul>
						</div>
						<div classes={['home-global']}>
							{!articles ? (
								<div classes={['article-preview']}>Loading... </div>
							) : (
								<FeedList type={feedType} articles={articles} />
							)}
						</div>
						{articles && (
							<FeedPagination
								total={total || 0}
								currentPage={pageNumber}
								fetchFeed={(page) => {
									icache.delete('articles');
									icache.set('pageNumber', page);
								}}
							/>
						)}
					</div>
					<Tags onTagSelect={onFeedChange} />
				</div>
			</div>
		</div>
	);
});

export default Home;