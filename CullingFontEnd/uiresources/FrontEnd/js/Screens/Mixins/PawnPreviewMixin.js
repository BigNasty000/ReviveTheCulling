var PawnPreviewMixin = {
  PreviewCustomization : function(custType, assetName)
  {
    engine.call("PreviewCustomization", custType, assetName);
  },
  ResetPreviews : function()
  {
    engine.call("ResetPreviews");
  }
}
