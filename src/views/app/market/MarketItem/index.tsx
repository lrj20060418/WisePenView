/**
 * 资料集市 · 资料详情深链路由。
 * 直接打开大尺寸详情弹层；关闭后返回上一页（浏览页背景不被本路由替换时的入口见 MarketBrowse）。
 */
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MarketDetailModal from '../_components/MarketDetailModal';
import { MARKET_PATH } from '../market.paths';
import page from './style.module.less';

function MarketItem() {
  const navigate = useNavigate();
  const { listingId = '' } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();

  const groupId = searchParams.get('groupId') ?? undefined;
  const type = searchParams.get('type') ?? undefined;
  const offerVersionRaw = searchParams.get('offerVersion');
  const offerVersion =
    offerVersionRaw != null && offerVersionRaw !== '' ? Number(offerVersionRaw) : undefined;

  return (
    <div className={page.root}>
      <MarketDetailModal
        target={
          listingId
            ? {
                resourceId: listingId,
                marketGroupId: groupId,
                offerVersion: Number.isFinite(offerVersion) ? offerVersion : undefined,
                resourceType: type,
              }
            : null
        }
        onClose={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate(MARKET_PATH.root);
        }}
      />
    </div>
  );
}

export default MarketItem;
