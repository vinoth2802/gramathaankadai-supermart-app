import ConfirmDialog from '@components/ConfirmDialog';
import AddPartyModal from '@features/parties/components/AddPartyModal';
import { usePOS } from '../hooks/usePOS';
import { CartPanel } from './CartPanel';
import { CheckoutBar } from './CheckoutBar';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { PartySelectorModal } from './PartySelectorModal';
import { SaleInfoBar } from './SaleInfoBar';
import { SaleTabs } from './SaleTabs';

export default function POS() {
  const pos = usePOS();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <SaleTabs
        saleTabs={pos.saleTabs}
        activeTabId={pos.activeTabId}
        setActiveTabId={pos.setActiveTabId}
        closeSaleTab={pos.closeSaleTab}
        addSaleTab={pos.addSaleTab}
      />

      <SaleInfoBar
        invoice={pos.invoice}
        saleType={pos.saleType}
        setSaleType={pos.setSaleType}
        selectedParty={pos.selectedParty}
        openPartyModal={() => pos.setPartyModal(true)}
      />

      <CartPanel
        cart={pos.cart}
        products={pos.products}
        filteredProducts={pos.filteredProducts}
        stockMap={pos.stockMap}
        search={pos.search}
        setSearch={pos.setSearch}
        showAll={pos.showAll}
        setShowAll={pos.setShowAll}
        searchRef={pos.searchRef}
        addToCart={pos.addToCart}
        removeFromCart={pos.removeFromCart}
      />

      <CheckoutBar
        subtotal={pos.subtotal}
        gst={pos.gst}
        grandTotal={pos.grandTotal}
        receivedAmount={pos.receivedAmount}
        updateReceivedAmount={pos.updateReceivedAmount}
        change={pos.change}
        paymentLines={pos.paymentLines}
        modes={pos.modes}
        updatePayLine={pos.updatePayLine}
        selectedParty={pos.selectedParty}
        prevPoints={pos.prevPoints}
        eligiblePoints={pos.eligiblePoints}
        totalPoints={pos.totalPoints}
        createSale={pos.createSale}
        cart={pos.cart}
        completeSale={pos.completeSale}
        openClearConfirm={() => pos.setClearConfirm(true)}
      />

      <PartySelectorModal
        open={pos.partyModal}
        onClose={() => pos.setPartyModal(false)}
        onAddParty={() => pos.setAddPartyModal(true)}
        partySearch={pos.partySearch}
        setPartySearch={pos.setPartySearch}
        filteredParties={pos.filteredParties}
        setSelectedParty={pos.setSelectedParty}
      />

      {pos.addPartyModal && (
        <AddPartyModal
          isSaving={pos.partySave.isSaving}
          onClose={() => pos.setAddPartyModal(false)}
          onSave={pos.partySave.handleSave}
          showSaveAndNew={false}
        />
      )}

      <ConfirmDialog
        open={pos.clearConfirm}
        title="Clear Cart"
        message="Remove all items from the cart? Stock will be restored."
        confirmLabel="Clear"
        onConfirm={pos.doClearCart}
        onClose={() => pos.setClearConfirm(false)}
      />

      {pos.printSale && (
        <InvoicePreviewModal
          sale={pos.printSale}
          settings={pos.settings}
          onClose={() => pos.setPrintSale(null)}
        />
      )}
    </div>
  );
}
