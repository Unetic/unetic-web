include $(TOPDIR)/rules.mk

PKG_NAME:=unetic-web
PKG_VERSION:=$(shell sed -n 's/.*"version": "\([^"]*\)".*/\1/p' $(CURDIR)/source/package.json | head -n1)
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

define Package/unetic-web
  SECTION:=admin
  CATEGORY:=Administration
  TITLE:=Unetic web interface
  URL:=https://github.com/Unetic/unetic-web
  PKGARCH:=all
  DEPENDS:=+uhttpd +uhttpd-mod-ubus +rpcd
endef

define Package/unetic-web/description
 Static web interface for Unetic, served by uhttpd.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) $(CURDIR)/source/. $(PKG_BUILD_DIR)/
endef

define Build/Compile
endef

define Package/unetic-web/install
	$(INSTALL_DIR) $(1)/www/unetic
	$(CP) $(PKG_BUILD_DIR)/dist/unetic-web/browser/. $(1)/www/unetic/
endef

$(eval $(call BuildPackage,unetic-web))
